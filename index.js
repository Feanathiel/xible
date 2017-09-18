'use strict';

var express = require('express');
var app = express();
var path = require('path');

app.use('/js/xible.js', express.static(path.join(__dirname, 'dist', 'xible.js')));
app.use(express.static(path.join(__dirname, 'editor')));
app.listen(9600);
