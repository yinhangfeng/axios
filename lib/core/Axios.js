'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
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
    var url = config;
    config = arguments[1];
    oriHeaders = config && config.headers;
    config = mergeConfig(this.defaults, config);
    config.url = url;
  } else {
    oriHeaders = config && config.headers;
    config = mergeConfig(this.defaults, config);
  }
  if (!config.method) {
    config.method = 'get';
  }
  if (!config.headers || config.headers === this.defaults.headers || config.headers === oriHeaders) {
    config.headers = config.headers ? new Headers(config.headers) : new Headers();
  }

  var requestState = config;
  // 0: fulfilled 1: rejected 2: promise
  var stateType = 0;
  function next(fulfilled, rejected) {
    if (stateType === 2) {
      requestState = requestState.then(fulfilled, rejected);
    } else {
      if (stateType === 0) {
        if (fulfilled) {
          try {
            requestState = fulfilled(requestState);
          } catch (e) {
            requestState = e;
            stateType = 1;
          }
        }
      } else if (rejected) {
        try {
          requestState = rejected(requestState);
          stateType = 0;
        } catch (e) {
          requestState = e;
        }
      }
      if (requestState && typeof requestState.then === 'function') {
        if (!(requestState instanceof promiseProvider.Promise)) {
          requestState = promiseProvider.Promise.resolve(requestState);
        }
        stateType = 2;
      }
    }
  }

  // Hook up interceptors middleware
  this.interceptors.request.forEach(next, true);
  next(dispatchRequest);
  this.interceptors.response.forEach(next);
  return requestState;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;
