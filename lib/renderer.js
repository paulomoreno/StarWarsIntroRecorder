'use strict';

var spawn = require('child_process').spawn;
var fs = require('fs');
var scp = require('scp2').scp;
var logger = require('./logger');
var Config = require('config');
var Utils = require('./utils');

// Deep copy SCP_SETTINGS and load privateKey if it is provided
var SCP_SETTINGS = JSON.parse(JSON.stringify(Config.SCP_SETTINGS));
if (SCP_SETTINGS.privateKey) {
  SCP_SETTINGS.privateKey = fs.readFileSync(SCP_SETTINGS.privateKey);
}

module.exports = class Renderer {
  constructor() {
    // The request queue to be processed
    this.queue = [];

    // Is this renderer currently processing any video?
    this.processing = false;
  }

  /* Add a video request to the rendering queue
   *
   * @param request {Object} a {email, code} object containing request data
   */
  add(request) {
    logger('queueing:', request.code, 'for', request.emails.join(', '));
    this.queue.push(request);

    // If the renderer is not currently processing nothing, start right away
    if (!this.processing) {
      this._process();
    }
  }

  /* Returns how many elements are in the queue + processing */
  queued() {
    return this.queue.length + (this.processing ? 1 : 0);
  }

  /* Jump the given code to the first available line position */
  expressify(code) {
    // Cannot use '[].find' because we need the index
    var index = null;
    var request = null;
    this.queue.some((r, i) => {
      if (r.code === code) {
        index = i;
        request = r;
        return true;
      }
    });

    // If the request was not found return false
    if (!request) {
      return false;
    }

    // Mark this request as a express one, so that it will not be skipped
    request.express = true;

    // We cannot put express codes ahead of other express codes
    var first = this.queue.reduce(function(memo, request) {
      // Do not account for itself
      if (request.code === code) {
        return memo;
      }

      return memo + (request.express ? 1 : 0);
    }, 0);

    // Remove the request from the queue
    this.queue.splice(index, 1);
    // Add the request on the first available position
    this.queue.splice(first, 0, request);
  }

  /*
   * Video Rendering / Messaging
   */

  _postProcess(status, request) {
    logger('processing of', request.code, 'finished with status', status);

    if (status !== 0) {
      // Mail system admins about the failure
      Utils.sendMail(
        Config.ADMIN_EMAILS,
        `[STAR WARS INTRO CREATOR] rendering ${request.code} failed`,
        `${request.code} for ${request.emails.join(',')}`
      );
      // release the mutex and start processing again
      this.processing = false;
      return this._process();
    }

    scp(`./dist/videos/${request.code}.mp4`, SCP_SETTINGS, err => {
      logger('file transfer ended with status', err);

      if (err) {
        Utils.sendMail(
          Config.ADMIN_EMAILS,
          `[STAR WARS INTRO CREATOR] transfering ${request.code} failed`,
          `${request.code} for ${request.emails.join(',')} (${JSON.stringify(err)})`
        );

        // Always release the mutex after an error
        this.processing = false;
        return this._process();
      }

      // Send the email to the users
      Utils.sendMail(
        request.emails,
        `[STAR WARS INTRO CREATOR] rendering ${request.code} finished`,
        [
          'Your Star Wars intro rendering has finished, you can download it at:',
          '',
          `${Config.BASE_URL}/${request.code}.mp4`,
          '',
          'Thanks for flying with us',
        ].join('\n')
      );

      logger('processed:', request.code, 'for', request.emails.join(', '));

      // release the mutex and start processing again
      this.processing = false;
      this._process();
    });
  }

  _process() {
    // Do not proceed if mutex 'processing' is active or queue is empty
    if (this.processing || this.queue.length === 0) {
      return;
    }

    let request = this.queue.shift();
    this.processing = request;
    logger('processing:', request.code, 'for', request.emails.join(', '));

    var spawned = spawn('./scripts/record.sh', [request.code]);
    // spawned.stdout.on('data', data => logger('record.sh:', data.toString()));
    // spawned.stderr.on('data', data => logger('error:', data.toString()));
    spawned.on('close', status => this._postProcess(status, request));
  }
}
