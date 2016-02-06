'use strict';

module.exports = function() {
  let moment = new Date();
  let args = Array.prototype.slice.call(arguments);
  console.log.apply(console, [moment.toISOString(), '-'].concat(args));
};
