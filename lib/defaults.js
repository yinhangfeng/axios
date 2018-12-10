'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', value);
  }
}

function getDefaultAdapter() {
  // var adapter;
  // // Only Node.JS has a process variable that is of [[Class]] process
  // if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
  //   // For node use HTTP adapter
  //   adapter = require('./adapters/http');
  // } else if (typeof XMLHttpRequest !== 'undefined') {
  //   // For browsers use XHR adapter
  //   adapter = require('./adapters/xhr');
  // }
  // return adapter;
  return require('./adapters/xhr');
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data, headers, response) {
    if (response.config.responseType === 'json' && response.status !== 204) {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      } else if (data === null) {
        // 设置xhr.responseType 为 'json' 时如果解析错误 xhr.response 为 null
        // 但也有可能body是 'null'
        throw new SyntaxError('json parse error');
      }
    }
    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  responseType: 'json',

  methodHeaders: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    }
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMehtodNoData(method) {
  defaults.methodHeaders[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.methodHeaders[method] = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };
});

module.exports = defaults;
