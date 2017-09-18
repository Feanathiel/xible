'use strict';

const oohttp = require('oohttp');
const EventEmitter = require('events').EventEmitter;

class XibleWrapper extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);

    var url = 'http://localhost:9600/'
    this.http = new oohttp.Base(url);

    this.Flow = require('./Flow.js')(this);
    this.Node = require('./Node.js')(this);
    this.NodeIo = require('./Io.js')(this);
    this.NodeInput = require('./Input.js')(this);
    this.NodeOutput = require('./Output.js')(this);
    this.Connector = require('./Connector.js')(this);
    this.TypeDef = require('./TypeDef.js')(this);
  }

  generateObjectId() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
    }
    return `${s4() + s4()}-${s4()}-${s4()}-${
      s4()}-${s4()}${s4()}${s4()}`;
  }
}

module.exports = XibleWrapper;
