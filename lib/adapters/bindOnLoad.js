'use strict';

module.exports = function(xhr, callback) {
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) {
      return;
    }

    // The request errored out and we didn't get a response, this will be
    // handled by onerror instead
    // With one exception: request that using file: protocol, most browsers
    // will return status as 0 even though it's a successful request
    if (xhr.status === 0 && !(xhr.responseURL && xhr.responseURL.indexOf('file:') === 0)) {
      return;
    }
    callback();
  };
};
