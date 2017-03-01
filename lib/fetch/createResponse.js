'use strict';

var fetch = require('./index');
var Response = fetch.Response;
var Headers = fetch.Headers;

function json() {
  return Response.prototype.text.call(this).then(function() {
    return this.__json;
  });
}

function unsupported() {
  throw new Error('Not supported when the responseType is json');
}

function clone() {
  // xhr._response: react-native
  // __json 对象可能已经被修改
  return new Response(this.xhr._response || JOSN.stringify(this.__json), {
    status: this.status,
    statusText: this.statusText,
    headers: new Headers(this.headers),
    url: this.url
  });
}

module.exports = function createResponse(bodyInit, options, extOptions) {
  var res;
  if (extOptions.isJson) {
    res = new Response(null, options);
    res.__json = bodyInit;
    res.json = json;
    res.clone = clone;
    res.arrayBuffer = res.blob = res.formData = res.text = unsupported;
  } else {
    res = new Response(bodyInit, options);
  }
  res.data = bodyInit;
  res.request = extOptions.request;
  res.xhr = extOptions.xhr;
  return res;
};