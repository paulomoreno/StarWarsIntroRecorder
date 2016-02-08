#!/usr/bin/env node
'use strict';

var fs = require('fs');
var Config = require('config');
var request = require('sync-request');

// The list of pending codes and e-mails to be processed
class PendingList {
  constructor() {
    this.pending = [];

    // Get the codes that have already been generated
    this.parsed = fs.readdirSync('./dist/videos/').map(function(file) {
      return file.replace(/\.mp4$/, '');
    });
  }

  add(code, email) {
    // Do not add codes that have already been parsed
    var parsed = this.parsed.find(parsedCode => {
      return parsedCode === code;
    });
    if (parsed) {
      return;
    }

    // Just add the e-mail to codes that are already in the pending list
    var request = this.pending.find(request => {
      return request.code === code;
    });
    if (request) {
      if (request.emails.indexOf(email) === -1) {
        request.emails.push(email);
      }
      return;
    }

    // Else just add another request
    this.pending.push({
      code: code,
      emails: [email],
    });
  }
}

var list = new PendingList;


// Which function to be executed when a given pattern is found on the log
var parsers = {
  '- queueing: ': function(line) {
    line = line.replace(/.*queueing: /g, '').split(' for ');
    list.add(line[0], line[1]);
  },

  '- adding ': function(line) {
    line = line.replace(/.*adding /g, '').split(' to ');
    list.add(line[1], line[0]);
  },

  'expressifying ': function(line) {
    var code = line.replace(/.*expressifying /g, '');
    list.pending.forEach(function(pending) {
      if (pending.code === code) {
        pending.express = true;
      }
    });
  },
}

var log = fs.readFileSync('./access.log').toString().split('\n');
log.forEach(function(line) {
  Object.keys(parsers).forEach(function(pattern) {
    if (line.match(new RegExp(pattern))) {
      parsers[pattern](line);
    }
  });
});

list.pending.forEach(pending => {
  console.log('refilling', pending.code);
  pending.emails.forEach(function(email) {
    console.log('    > adding', email);
    request('GET', 'http://localhost:1977/video-request', {
      qs: {
        code: pending.code,
        email: email,
      },
    });
  });

  // If the request was expressified, expressify it again
  if (pending.express) {
    console.log('    > expressifying', pending.code);
    request('GET', 'http://localhost:1977/expressify', {
      qs: {
        code: pending.code,
        auth: Config.AUTH,
      },
    });
  }
});
