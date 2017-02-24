'use strict';

var utils = require('./../utils');
var promiseProvider = require('../promiseProvider');

function isThenable(obj) {
  return obj && utils.isFunction(obj.then);
}

/**
 * Transform the data for a request or a response
 * 
 * 数据处理函数可以返回Promise
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns Promise The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  // TODO 支持promise 链
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    if (isThenable(data)) {
      data = data.then(function(d) {
        return fn(d, headers);
      });
    } else {
      data = fn(data, headers);
    }
  });

  return sThenable(data) ? data : promiseProvider.Promise.resolve(data);
};
