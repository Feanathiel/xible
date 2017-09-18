var XibleWrapper = require('./wrapper.js');

var xibleWrapper = new XibleWrapper();
xibleWrapper.on('error', (err) => {
    console.log(err);
});

module.exports = xibleWrapper;
