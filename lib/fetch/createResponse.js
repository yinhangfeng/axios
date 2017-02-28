'use strict';

var Promise = require('../promiseProvider').Promise;
var Response = require('./index').Response;

function json() {
  return Promise.resolve(this.__json);
}

function clone() {
  var res = Response.prototype.clone.call(this);
  if (this.__json) {
    res.__json = this.__json;
    res.json = json;
  }
  return res;
}

module.exports = function createResponse(bodyInit, options, isJson) {
  var res = new Response(bodyInit, options);
  if (isJson) {
    res.__json = bodyInit;
    res.json = json;
    res.clone = clone;
  }
  return res;
};