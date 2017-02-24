'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var promiseProvider = require('../promiseProvider');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

function flattenHeaders(config) {
  var headers = config.headers;
  function forEachHeaders(val, key) {
    if (!(key in headers)) {
      headers[key] = val;
    }
  }
  utils.forEach(config.methodHeaders[config.method], forEachHeaders);
  utils.forEach(config.methodHeaders.common, forEachHeaders);
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  return transformData(
    config.data,
    config.headers,
    config.transformRequest
  ).then(function onTransformRequestDataResolution(data) {
    config.data = data;
    flattenHeaders(config);

    var adapter = config.adapter || defaults.adapter;

    return adapter(config).then(function onAdapterResolution(response) {
      throwIfCancellationRequested(config);

      // Transform response data
      // TODO
      response.data = transformData(
        response.data,
        response.headers,
        config.transformResponse
      );

      return response;
    }, function onAdapterRejection(reason) {
      if (!isCancel(reason)) {
        throwIfCancellationRequested(config);

        // Transform response data
        if (reason && reason.response) {
          reason.response.data = transformData(
            reason.response.data,
            reason.response.headers,
            config.transformResponse
          );
        }
      }

      return promiseProvider.Promise.reject(reason);
    });
  });
};
