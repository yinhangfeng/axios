'use strict';

var utils = require('../utils');
var settle = require('../core/settle');
var buildURL = require('../helpers/buildURL');
var parseHeaders = require('../fetch/parseHeaders');
var isURLSameOrigin = require('../helpers/isURLSameOrigin');
var createError = require('../core/createError');
var btoa = (typeof window !== 'undefined' && window.btoa && window.btoa.bind(window)) || require('./../helpers/btoa');
var promiseProvider = require('../promiseProvider');
var bindOnLoad = require('../bindOnLoad');

module.exports = function xhrAdapter(config) {
  return new promiseProvider.Promise(function dispatchXhrRequest(resolve, reject, onCancel) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isUndefined(requestData) || utils.isFormData(requestData)) {
      requestHeaders.delete('Content-Type');
    }

    var request = new XMLHttpRequest();

    // var loadEvent = 'onreadystatechange';
    // var xDomain = false;

    // For IE 8/9 CORS support
    // Only supports POST and GET calls and doesn't returns the response headers.
    // DON'T do this for testing b/c XMLHttpRequest is mocked, not XDomainRequest.
    // if (process.env.NODE_ENV !== 'test' &&
    //     typeof window !== 'undefined' &&
    //     window.XDomainRequest && !('withCredentials' in request) &&
    //     !isURLSameOrigin(config.url)) {
    //   request = new window.XDomainRequest();
    //   loadEvent = 'onload';
    //   xDomain = true;
    //   request.onprogress = function handleProgress() {};
    //   request.ontimeout = function handleTimeout() {};
    // }

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for onload
    bindOnLoad(request, function handleLoad() {
      if (!request) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        // IE sends 1223 instead of 204 (https://github.com/mzabriskie/axios/issues/201)
        status: request.status === 1223 ? 204 : request.status,
        statusText: request.status === 1223 ? 'No Content' : request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    });

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED'));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (config.xsrfCookieEnabled && utils.isStandardBrowserEnv()) {
      var cookies = require('./../helpers/cookies');

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) ?
          cookies.read(config.xsrfCookieName) :
          undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      requestHeaders.forEach(function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
        if (config.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    // support bluebird Cancellation http://bluebirdjs.com/docs/api/cancellation.html
    if (onCancel) {
      onCancel(function() {
        if (request) {
          request.abort();
          request = null;
        }
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};
