'use strict';

// react-native-web
module.exports = function(xhr, callback) {
  xhr.onload = callback;
};