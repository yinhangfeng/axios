'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
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
  var headersCopied;
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      if (key === 'headers') {
        if (!headersCopied) {
          result[key] = new Headers(result[key]);
          headersCopied = true;
        }
        result[key] = mergeHeaders(result[key], val);
      } else {
        result[key] = utils.merge(result[key], val);
      }
    } else {
      if (key === 'headers' && !(val instanceof Headers)) {
        headersCopied = true;
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
 * @param {any} data 
 * @param {Number} type 0: fulfilled 1: rejected 2: promise
 */
function createInterceptorExecutor(data, type) {
  /**
   * @param {Number} returnType 是否返回data
   * 1: 如果当前为rejected 则返回 Promise.rejected
   * 2: 强制返回Promise
   */
  return function execNext(fulfilled, rejected, returnType) {
    if (fulfilled || rejected) {
      if (type === 2) {
        data = data.then(fulfilled, rejected);
      } else {
        if (type === 0 && fulfilled) {
          try {
            data = fulfilled(data);
          } catch (e) {
            data = e;
            type = 1;
          }
        } else if (rejected) {
          try {
            data = rejected(data);
            type = 0;
          } catch (e) {
            data = e;
          }
        }
        if (typeof data.then === 'function') {
          if (!(data instanceof promiseProvider.Promise)) {
            data = promiseProvider.Promise.resolve(data);
          }
          type = 2;
        }
      }
    }

    if (returnType) {
      if (returnType === 1 && type === 1) {
        return promiseProvider.Promise.reject(data);
      }
      if (returnType === 2 && type !== 2) {
        return type === 0 ? promiseProvider.Promise.resolve(data) : promiseProvider.Promise.reject(data);
      }
      return data;
    }
  }
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
  this._onRequestSuccess = this._onRequestSuccess.bind(this);
  this._onRequestError = this._onRequestError.bind(this);
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
    oriHeaders = arguments[1] && arguments[1].headers;
    config = mergeConfig(this.defaults, arguments[1]);
    config.url = arguments[0];
  } else {
    oriHeaders = config && config.headers;
    config = mergeConfig(this.defaults, config);
  }
  
  if (!config.method) {
    config.method = 'get';
  }

  if (!config.headers || config.headers === this.defaults.headers || config.headers === oriHeaders) {
    config.headers = new Headers(config.headers);
  }

  // Hook up interceptors middleware
  var execNext = createInterceptorExecutor(config, 0);
  this.interceptors.request.forEach(execNext, true);
  return execNext(dispatchRequest, null, 2)
    .then(this._onRequestSuccess, this._onRequestError);
};

Axios.prototype._onRequestSuccess = function _onRequestSuccess(response) {
  return this._execResponseInterceptor(response, 0); 
};

Axios.prototype._onRequestError = function _onRequestError(error) {
  return this._execResponseInterceptor(error, 1); 
};

Axios.prototype._execResponseInterceptor = function _execResponseInterceptor(data, type) {
  var execNext = createInterceptorExecutor(data, type);
  this.interceptors.response.forEach(execNext);
  return execNext(null, null, 1);
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
