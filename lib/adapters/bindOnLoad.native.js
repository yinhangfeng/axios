'use strict';

// react-native react-native-web
module.exports = function(xhr, callback) {
  xhr.onload = callback;
};