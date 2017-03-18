'use strict';

const Promise = require('bluebird');
const exAxios = require('ex-axios');
exAxios.Promise = Promise;

const myExAxios = exAxios.create({

});

window.request = function request(url, responseType, method) {
  var xhr = new XMLHttpRequest();

  xhr.onload = function() {
    console.log("onload ", xhr.response, xhr.responeText, xhr.getAllResponseHeaders(), xhr);
  };

  xhr.onerror = function() {
    console.log("onerror", xhr);
  };

  xhr.ontimeout = function() {
    console.log("ontimeout");
  };

  xhr.open(method || "get", url, true);

  xhr.responseType = responseType || "json";

  xhr.send(null);
}


let requestPromise;
document.querySelector('#test1').addEventListener('click', () => {
  requestPromise = myExAxios({
    url: 'http://example.com'
  }).then((res) => {
    requestPromise = null;
    console.log('res', res);
  }, (err) => {
    requestPromise = null;
    console.log('err', err);
  });
});

document.querySelector('#test2').addEventListener('click', () => {
  if (requestPromise) {
    requestPromise.cancel();
    requestPromise = null;
  }
});

document.querySelector('#test3').addEventListener('click', () => {
  
});