'use strict';

var Config = require('config');
var logger = require('../lib/logger');

/* Add CORS headers on the response and log it */
Function.prototype.request = function() {
  var func = this;
  return function(request, response) {
    logger(request.method, request.path, JSON.stringify(request.query));
    response.header('Access-Control-Allow-Origin', '*');

    // Proceed normally
    var args = Array.prototype.slice.call(arguments);
    return func.apply(null, args);
  };
};

/* Checks if the request is authenticated */
Function.prototype.authenticated = function() {
  var func = this;
  return function(request, response) {
    // Check if the auth code matches
    if (request.query.auth !== Config.AUTH) {
      // Returns unauthorized if there was no match
      return response.status(401).send('not_authorized');
    }

    // Proceed normally
    var args = Array.prototype.slice.call(arguments);
    return func.apply(null, args);
  };
};

/* Check if the request has the given attributes */
Function.prototype.has = function() {
  var attributes = Array.prototype.slice.call(arguments);
  var func = this;
  return function(request, response) {
    var failed = attributes.some(function(attr) {
      // Check if each of the attributes are present
      if (!request.query[attr]) {
        // Return bad request if any of them are missing
        response.status(400).send('missing_' + attr);
        return true;
      }
    });

    if (!failed) {
      // Proceed normally, if nothing failed
      var args = Array.prototype.slice.call(arguments);
      return func.apply(null, args);
    }
  };
}

module.exports = Function;
