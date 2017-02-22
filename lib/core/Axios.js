'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = utils.merge(defaults, instanceConfig);
  if (this.defaults.Promise) {
    this.Promise = this.defaults.Promise;
    delete this.defaults.Promise;
  } else {
    this.Promise = Promise;
  }
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * 配置Promise
 */
Axios.prototype.configPromise = function configPromise(p) {
  this.Promise = p;
};

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge(arguments[1]);
    config.url = arguments[0];
  }

  config = utils.merge(this.defaults, config);
  if (!config.method) {
    config.method = 'get';
  }

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Hook up interceptors middleware
  var chain = [];
  var promise = this.Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  chain.push(dispatchRequest, undefined);

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  for (var i = 0; i < chain.length;) {
    promise = promise.then(chain[i++], chain[i++]);
  }

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

module.exports = Axios;
