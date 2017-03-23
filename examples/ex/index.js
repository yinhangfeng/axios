'use strict';

const Promise = require('bluebird');
const exAxios = require('ex-axios');
const CancelToken = exAxios.CancelToken;
Promise.config({
    // Enable warnings
    warnings: true,
    // Enable long stack traces
    longStackTraces: true,
    // Enable cancellation
    cancellation: true,
    // Enable monitoring
    monitoring: true
});
exAxios.Promise = Promise;

let headers = new Headers();
headers.set('user-agent', 'ex-axios');

const myExAxios = exAxios.create({
  headers,
});

myExAxios.interceptors.request.use((config) => {
  console.log('interceptors request config', config);
  config.headers.set('Authorization', 'xxx');
  return config;
}, (error) => {
  console.log('interceptors request error', error);
  return Promise.reject(error);
});

myExAxios.interceptors.response.use((res) => {
  console.log('interceptors response res', res);
  return res;
}, (res) => {
  console.log('interceptors response error', res);
  return Promise.reject(res);
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


let cancelAble;
document.querySelector('#test1').addEventListener('click', () => {
  cancelAble = myExAxios({
    url: 'http://example.com'
  }).then((res) => {
    cancelAble = null;
    console.log('res', res);
  }, (err) => {
    cancelAble = null;
    console.log('err', err);
  });
});

document.querySelector('#test2').addEventListener('click', () => {
  if (cancelAble) {
    cancelAble.cancel();
    cancelAble = null;
  }
});

document.querySelector('#test3').addEventListener('click', () => {
  cancelAble = myExAxios.post({
    url: '/post',
    data: {
      aaa: 1,
      bbb: 'bbb',
    }
  }).then((res) => {
    console.log('post success', res);
  }, (error) => {
    console.log('post error', error);
  }).finally(() => {
    console.log('test3 finally');
  });
});

document.querySelector('#test4').addEventListener('click', () => {
  cancelAble = CancelToken.source();

  myExAxios.delete({
    url: '/delete',
    data: {
      aaa: 1,
      bbb: 'bbb',
    },
    cancelToken: cancelAble.token,
  }).then((res) => {
    cancelAble = null;
    console.log('delete success', res);
  }, (error) => {
    cancelAble = null;
    if (exAxios.isCancel(error)) {
      console.log('delete Request canceled', error);
    } else {
      console.log('delete error', error);
    }
  }).finally(() => {
    console.log('delete finally');
  });
});

document.querySelector('#test5').addEventListener('click', () => {
  myExAxios.post({
    url: '/xxx',
    data: {
      aaa: 1,
      bbb: 'bbb',
    }
  }).then((res) => {
    console.log('xxx success', res);
  }, (error) => {
    console.log('xxx error', error);
  });
});