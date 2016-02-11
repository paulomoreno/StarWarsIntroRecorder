#!/usr/bin/env node
'use strict';

var Config = require('config');
var express = require('express');
var Scheduler = require('../lib/scheduler');
var logger = require('../lib/logger');
var Utils = require('../lib/utils');
require('../lib/decorators');

var app = express();
var scheduler = new Scheduler(1);

// Bump a code in the queue to the first available position
app.get('/bump', function (request, response) {
  var code = request.query.code;
  var element = scheduler.status(code);

  if (!element.request) {
    return response.status(404).send('code_not_found');
  }

  if (element.request.express) {
    return response.status(200).send('already_expressified');
  }

  // Expressify the code and return the user's new position on the queue
  logger('expressifying', code);
  scheduler.expressify(code);
  var status = scheduler.status(code);

  response.send({queue: status.queue});
}.request().authenticated().has('code'));

// remove a code from the queue
app.get('/bounce', function (request, response) {
  var indexes = null;
  scheduler.renderers.forEach(function(renderer, i) {
    renderer.queue.forEach(function(r, j) {
      if (r.code === request.query.code) {
        indexes = [i, j];
      }
    });
  });

  if (!indexes) {
    return response.status(404).send('code_not_found');
  }

  var code = scheduler.renderers[indexes[0]].queue.splice(indexes[1], 1);
  response.send(code[0]);
}.request().authenticated());

// Serve the whole queue status
app.get('/queue', function (request, response) {
  var queues = scheduler.renderers.map(function(renderer) {
    return {
      processing: renderer.processing,
      queue: renderer.queue,
    };
  });
  response.send(queues);
}.request().authenticated());

app.get('/status', function (request, response) {
  var status = scheduler.status(request.query.code);
  response.send({queue: status.queue});
}.request().authenticated());

app.get('/request', function (request, response) {
  // First, check if all data that is needed to build the video is here
  var code = request.query.code;
  var email = request.query.email.toLowerCase();
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

  scheduler.add({code: code, emails: [email]});
  return response.send({queue: status.queue});
}.request().authenticated().has('code', 'email'));

var port = parseInt(process.argv[2] || 1994);
var server = app.listen(port, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Listening at http://%s:%s', host, port);
});
