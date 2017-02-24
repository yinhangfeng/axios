'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');
var promiseProvider = require('../promiseProvider');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = utils.merge(defaults, instanceConfig);
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 * // TODO 支持config 为fetch 的Request
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge(this.defaults, arguments[1]);
    config.url = arguments[0];
  } else {
    config = utils.merge(this.defaults, config);
  }
  
  if (!config.method) {
    config.method = 'get';
  }

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // 拷贝headers 确保后续interceptors 可以直接对headers对象进行修改
  if (config.headers === this.defaults.headers) {
    config.headers = utils.merge(config.headers);
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
utils.forEach(['delete', 'get', 'head', 'post', 'put', 'patch'], function forEachMethod(method) {
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
