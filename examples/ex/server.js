'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());

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
  return res.status(204).end();
});

var server = app.listen(9000, function() {
  console.log('Server started: http://localhost:' + server.address().port + '/');
});