'use strict';

const Promise = require('bluebird');
const exAxios = require('ex-axios');
exAxios.Promise = Promise;

const myExAxios = exAxios.create({

});

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