'use strict';

var utils = require('../utils');
var Headers = require('./index').Headers;

module.exports = function parseHeaders(rawHeaders) {
  var headers = new Headers();
  var key;
  var i;

  if (!rawHeaders) return headers;

  rawHeaders.split(/\r?\n/).forEach(function(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    if (key) {
      headers.append(key, utils.trim(line.substr(i + 1)))
    }
  })
  return headers
};