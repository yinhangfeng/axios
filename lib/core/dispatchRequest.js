'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var promiseProvider = require('../promiseProvider');
var enhanceError = require('./enhanceError');

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
    if (!headers.has(key)) {
      headers.set(key, val);
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

  // Transform request data
  config.data = transformData(
    config.data,
    config,
    config.transformRequest
  );

  // Flatten headers
  flattenHeaders(config.headers);

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    try {
      response.data = transformData(
        response.data,
        response,
        config.transformResponse
      );
    } catch (e) {
      return premiseProvider.Promise.reject(enhanceError(
        e,
        response.config,
        null,
        response
      ));
    }

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        try {
          reason.response.data = transformData(
            reason.response.data,
            response,
            config.transformResponse
          );
        } catch (e) {
          reason.transformResponseError = e;
        }
      }
    }

    return promiseProvider.Promise.reject(reason);
  });
};
