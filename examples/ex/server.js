'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log('\n\nurl:', req.url, '\nheaders:', req.headers, '\nbody:', req.body);
  next();
});

app.use('/', express.static(__dirname));

app.get('/test1', (req, res) => {
  res.json({
    xxx: 1,
  });
});

app.get('/test2', (req, res) => {
  res.send('xxxx').end();
});

app.delete('/delete', (req, res) => {
  setTimeout(() => {
    res.status(204).end()
  }, 5000);
});

app.post('/post', (req, res) => {
  setTimeout(() => {
    res.json(req.body);
  }, 5000);
});

app.post('/xxx', (req, res) => {
  setTimeout(() => {
    res.send('xxxx');
  }, 5000);
});

var server = app.listen(9000, function() {
  console.log('Server started: http://localhost:' + server.address().port + '/');
});