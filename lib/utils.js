var fs = require('fs');
var Config = require('config');
var logger = require('./logger');
var request = require('sync-request');

module.exports = {
  fileExists: function(path) {
    try {
      fs.accessSync(path, fs.F_OK);
      return true;
    } catch (exception) {
      return false;
    }
  },

  sendMail: function(list, subject, content) {
    list.forEach(function(email) {
      logger('sending email to', email);
      var response = request('GET', Config.MAILER_URL, {
        qs: {
          email: email,
          subject: subject,
          body: content,
        }
      });

      logger('mail sending ended with response:', response.statusCode);
    });
  },
};
