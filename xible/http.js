const oohttp = require('oohttp');

// :(
const url = 'http://localhost:9600/'
const http = new oohttp.Base(url);

module.exports = http;
