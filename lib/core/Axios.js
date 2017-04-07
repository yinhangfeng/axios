'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');
var promiseProvider = require('../promiseProvider');
var Headers = require('../fetch/Headers');

function mergeHeaders(headers1, headers2) {
  if (!(headers1 instanceof Headers)) {
    headers1 = new Headers(headers1);
  }
  if (!(headers2 instanceof Headers)) {
    headers2 = new Headers(headers2);
  }
  headers2.forEach(function(value, name) {
    headers1.set(name, value);
  });
  return headers1;
}

function mergeConfig() {
  var result = {};
  var headersCopyed;
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      if (key === 'headers') {
        if (!headersCopyed) {
          result[key] = new Headers(result[key]);
          headersCopyed = true;
        }
        result[key] = mergeHeaders(result[key], val);
      } else {
        result[key] = utils.merge(result[key], val);
      }
    } else {
      if (key === 'headers' && !(val instanceof Headers)) {
        headersCopyed = true;
        result[key] = new Headers(val);
      }
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    utils.forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = mergeConfig(defaults, instanceConfig);
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  var oriHeaders;
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    oriHeaders = arguments[1].headers;
    config = mergeConfig(this.defaults, arguments[1]);
    config.url = arguments[0];
  } else {
    oriHeaders = config.headers;
    config = mergeConfig(this.defaults, config);
  }
  
  if (!config.method) {
    config.method = 'get';
  }

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  if (!config.headers || config.headers === this.defaults.headers || config.headers === oriHeaders) {
    config.headers = new Headers(config.headers);
  }

  // Hook up interceptors middleware
  var promise = promiseProvider.Promise.resolve(config);

  function forEachInterceptors(interceptor) {
    promise = promise.then(interceptor.fulfilled, interceptor.rejected);
  }

  this.interceptors.request.forEach(forEachInterceptors, true);
  promise = promise.then(dispatchRequest);
  this.interceptors.response.forEach(forEachInterceptors);

  return promise;
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'post', 'put', 'patch', 'options'], function forEachMethod(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(config) {
    if (typeof config === 'string') {
      config = utils.merge(arguments[1]);
      config.url = arguments[0];
    } else {
      config = utils.merge(config);
    }
    config.method = method;
    return this.request(config);
  };
});
Axios.prototype.del = Axios.prototype.delete;

module.exports = Axios;
