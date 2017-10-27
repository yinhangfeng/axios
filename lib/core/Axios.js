'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var promiseProvider = require('../promiseProvider');
var Headers = require('../fetch/Headers');

function mergeHeaders(headers1, headers2) {
  if (headers2 instanceof Headers) {
    headers2.forEach(function(value, name) {
      headers1.set(name, value);
    });
  } else {
    utils.forEach(headers2, function(value, name) {
      headers1.set(name, value);
    });
  }
  
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
 * @param {any} state 
 * @param {Number} type 0: fulfilled 1: rejected 2: promise
 */
function requestChain(state, type) {
  return function next(fulfilled, rejected, returnPromise) {
    if (fulfilled || rejected) {
      if (type === 2) {
        state = state.then(fulfilled, rejected);
      } else {
        if (type === 0 && fulfilled) {
          try {
            state = fulfilled(state);
          } catch (e) {
            state = e;
            type = 1;
          }
        } else if (rejected) {
          try {
            state = rejected(state);
            type = 0;
          } catch (e) {
            state = e;
          }
        }
        if (state && typeof state.then === 'function') {
          if (!(state instanceof promiseProvider.Promise)) {
            state = promiseProvider.Promise.resolve(state);
          }
          type = 2;
        }
      }
    }

    if (returnPromise) {
      if (type !== 2) {
        return type === 0 ? promiseProvider.Promise.resolve(state) : promiseProvider.Promise.reject(state);
      }
      return state;
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
  var next = requestChain(config, 0);
  this.interceptors.request.forEach(next, true);
  next(dispatchRequest);
  this.interceptors.response.forEach(next);
  return next(null, null, true);
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
