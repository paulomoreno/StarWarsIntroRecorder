#!/usr/bin/env node
'use strict';

var Config = require('config');
var express = require('express');
var Scheduler = require('../lib/scheduler');
var logger = require('../lib/logger');
var Utils = require('../lib/utils');

var app = express();
var scheduler = new Scheduler(1);

app.get('/status', function (request, response) {
  logger('GET', '/status', request.query);
  response.header('Access-Control-Allow-Origin', '*');

  var code = request.query.code;
  var status = scheduler.status(code);
  if (!status.request && Utils.fileExists(`./dist/videos/${code}.mp4`)) {
    return response.send({url: `${Config.BASE_URL}/${code}.mp4`});
  }

  response.send({
    queue: status.queue,
  });
});

app.get('/video-request', function (request, response) {
  logger('GET', '/video-request', request.query);
  response.header('Access-Control-Allow-Origin', '*');

  // First, check if all data that is needed to build the video is here
  let code = request.query.code;
  let email = request.query.email;
  if (!email) {
    return response.status(400).send({error: 'missing_email'});
  } else if (!code) {
    return response.status(400).send({error: 'missing_code'});
  }

  var status = scheduler.status(code);
  if (status.request) {
    // If the request is already being processed add the user to the mailing
    // list, but check if the user is in the list first
    if (status.request.emails.indexOf(email) === -1) {
      logger('adding', email, 'to', code);
      status.request.emails.push(email);
    }
    return response.send({queue: status.queue});
  }

  // If the file already exists, send its URL
  if (Utils.fileExists(`./dist/videos/${code}.mp4`)) {
    logger(`${code} already rendered`);
    return response.send({url: `${Config.BASE_URL}/${code}.mp4`});
  }

  scheduler.add({code: code, emails: [email]});
  return response.send({queue: status.queue});
});

var port = parseInt(process.argv[2] || 1994);
var server = app.listen(port, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Listening at http://%s:%s', host, port);
});
