(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Xible = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
'use strict';

// node specific imports required to handle http(s) requests
let https;
let http;
let url;
if (typeof window === 'undefined') {
  https = require('https');
  http = require('http');
  url = require('url');
}

/**
 * Returns the byte length of an utf-8 encoded string.
 * From http://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
 * @param {String} str String to calculate the byte length of.
 * @returns {Number} The bytelength.
 */
function utf8ByteLength(str) {
  let s = str.length;
  let i;
  for (i = str.length - 1; i >= 0; i -= 1) {
    const code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) {
      s += 1;
    } else if (code > 0x7ff && code <= 0xffff) {
      s += 2;
    }

    // trail surrogate
    if (code >= 0xDC00 && code <= 0xDFFF) {
      i -= 1;
    }
  }

  return s;
}

class Url {

  constructor(obj) {
    this.protocol = null;
    this.auth = null;
    this.hostname = null;
    this.port = null;
    this.pathname = null;
    this.query = {};
    this.hash = null;

    if (obj) {
      Object.assign(this, Url.parse(obj));
    }
  }

  static parse(obj) {
    const returnObj = {};
    if (typeof obj === 'string') {
      returnObj.origStr = obj;
      let remainingPath = obj;

      const protocolDividerIndex = remainingPath.indexOf('://');
      if (protocolDividerIndex > -1) {
        returnObj.protocol = obj.substring(0, protocolDividerIndex) || null;
        remainingPath = obj.substring(protocolDividerIndex + 3);
      }

      const portDividerIndex = remainingPath.indexOf(':');
      if (portDividerIndex > -1) {
        returnObj.hostname = remainingPath.substring(0, portDividerIndex) || null;
        remainingPath = remainingPath.substring(portDividerIndex + 1);
      }

      const hashDividerIndex = remainingPath.lastIndexOf('#');
      if (hashDividerIndex > -1) {
        returnObj.hash = remainingPath.substring(hashDividerIndex + 1) || null;
        remainingPath = remainingPath.substring(0, hashDividerIndex);
      }

      const queryStringDividerIndex = remainingPath.lastIndexOf('?');
      if (queryStringDividerIndex > -1) {
        returnObj.search = remainingPath.substring(queryStringDividerIndex) || null;
        remainingPath = remainingPath.substring(0, queryStringDividerIndex);
        if (returnObj.search) {
          returnObj.query = this.parseQueryString(returnObj.search);
        }
      }

      const pathDividerIndex = remainingPath.indexOf('/');
      if (portDividerIndex > -1) {
        if (pathDividerIndex > -1) {
          returnObj.port = +remainingPath.substring(0, pathDividerIndex);
          remainingPath = remainingPath.substring(pathDividerIndex);
          returnObj.pathname = remainingPath;
        } else {
          returnObj.port = +remainingPath;
        }
      } else if (protocolDividerIndex === -1 || pathDividerIndex === 0) {
        returnObj.pathname = remainingPath || null;
      } else if (pathDividerIndex > -1) {
        returnObj.hostname = remainingPath.substring(0, pathDividerIndex) || null;
        returnObj.pathname = remainingPath.substring(pathDividerIndex);
      } else {
        returnObj.hostname = remainingPath || null;
      }
    } else {
      const search = obj.search;
      let query = obj.query;
      const path = obj.path;
      let pathname = obj.pathname;

      // path
      if (path && !pathname && !search && !query) {
        if (path.includes('?')) {
          const querySplit = path.split('?');
          pathname = querySplit[0];
          query = querySplit[1];
        } else {
          pathname = path;
        }
      }

      // querystring
      if (search && !query) {
        returnObj.query = this.parseQueryString(search);
      }

      // protocol
      if (typeof obj.protocol === 'string') {
        if (obj.protocol.slice(-1) === ':') {
          returnObj.protocol = obj.protocol.substring(0, obj.protocol.length - 1);
        } else {
          returnObj.protocol = obj.protocol;
        }
      }

      returnObj.hostname = obj.hostname || null;
      returnObj.port = obj.port || null;
      returnObj.pathname = obj.pathname || null;
      returnObj.query = obj.query || {};
    }

    return returnObj;
  }

  static parseQueryString(search) {
    if (!search) {
      return {};
    }

    const query = {};
    let searchSplit = search;
    if (searchSplit.charAt() === '?') {
      searchSplit = searchSplit.substring(1);
    }
    searchSplit = searchSplit.split('&');
    let queryName;
    let queryValue;
    let querySplit;
    for (let i = 0; i < searchSplit.length; i += 1) {
      querySplit = searchSplit[i].split('=');
      if (querySplit.length === 2) {
        queryName = querySplit[0];
        queryValue = querySplit[1];
        if (typeof query[queryName] === 'string') {
          query[queryName] = [query[queryName], queryValue];
        } else if (Array.isArray(query[queryName])) {
          query[queryName].push(queryValue);
        } else {
          query[queryName] = queryValue;
        }
      }
    }
    return query;
  }

  /**
  * Merges another (base-)url into this url.
  * This url is dominant, therefor all values in the current url will be kept.
  * Only new values (querystring parts, missing protocol, etc) will be added.
  * @param {Url} baseUrl The url to merge from.
  */
  mergeFrom(baseUrl) {
    if ((baseUrl instanceof Base) || (baseUrl instanceof Request)) {
      baseUrl = baseUrl.url;
    }

    if (typeof baseUrl === 'string') {
      baseUrl = new Url(baseUrl);
    }

    if (!baseUrl) {
      return;
    }

    if (!this.protocol && baseUrl.protocol) {
      this.protocol = baseUrl.protocol;
    }

    if (!this.auth && baseUrl.auth) {
      this.auth = baseUrl.auth;
    }

    if (!this.hostname && baseUrl.hostname) {
      this.hostname = baseUrl.hostname;
    }

    if (!this.port && baseUrl.port) {
      this.port = baseUrl.port;
    }

    if (!this.pathname && baseUrl.pathname) {
      this.pathname = baseUrl.pathname;
    }

    // querystring
    if (baseUrl.query) {
      const baseQueryKeys = Object.keys(baseUrl.query);
      if (baseQueryKeys.length) {
        let baseQueryName;
        let baseQueryValue;
        for (let i = 0; i < baseQueryKeys.length; i += 1) {
          baseQueryName = baseQueryKeys[i];
          baseQueryValue = baseUrl.query[baseQueryName];
          if (!this.query[baseQueryName]) {
            this.query[baseQueryName] = baseQueryValue;
          } else {
            if (!Array.isArray(this.query[baseQueryName])) {
              this.query[baseQueryName] = [this.query[baseQueryName]];
            }
            if (Array.isArray(baseQueryValue)) {
              for (let j = 0; j < baseQueryValue.length; j += 1) {
                this.query[baseQueryName].push(baseQueryValue[j]);
              }
            } else {
              this.query[baseQueryName].push(baseQueryValue);
            }
          }
        }
      }
    }

    if (!this.hash && baseUrl.hash) {
      this.hash = baseUrl.hash;
    }
  }

  /**
  * Returns a string representation of the url.
  * Omits missing values, no defaults are applied here.
  * The port number is left out if the related protocol for that port is used.
  * I.e: if the protocol equals 'https' and port 443 is specified,
  * the port will not be part of the returned string.
  * @returns {String} The url string.
  */
  toString() {
    let str = '';

    if (this.protocol) {
      str += `${this.protocol}://`;
    }

    if (this.auth) {
      str += `${this.auth}@`;
    }

    // hostname
    if (this.hostname) {
      str += `${this.hostname}`;
      if (this.port &&
        (!this.protocol || Url.protocolPortNumbers[this.protocol] !== this.port)
      ) {
        str += `:${this.port}`;
      }
    }

    if (this.pathname) {
      str += this.pathname;
    }

    // querystring
    if (this.query) {
      const queryKeys = Object.keys(this.query);
      if (queryKeys.length) {
        str += '?';
        let queryName;
        let queryValues;
        for (let i = 0; i < queryKeys.length; i += 1) {
          queryName = queryKeys[i];
          queryValues = this.query[queryName];
          if (Array.isArray(queryValues)) {
            for (let j = 0; j < queryValues.length; j += 1) {
              str += `${(i || j) ? '&' : ''}${encodeURIComponent(queryName)}=${encodeURIComponent(queryValues[j])}`;
            }
          } else {
            str += `${i ? '&' : ''}${encodeURIComponent(queryName)}=${encodeURIComponent(queryValues)}`;
          }
        }
      }
    }

    // hash
    if (this.hash) {
      str += `#${this.hash}`;
    }

    return str;
  }

}

Url.protocolPortNumbers = {
  ftp: 21,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};

class Request {

  constructor(method, reqUrl) {
    this.open(method, reqUrl);
  }

  open(method, reqUrl) {
    this.method = method;
    this.url = reqUrl;
    this.headers = {};

    if (this.url && !(this.url instanceof Url)) {
      this.url = new Url(this.url);
    }
  }

  /**
  * Parses the result through JSON and passes it to the given constructor.
  * @param {Constructor} Constr The constructor
  * @param {Object} [data] An object to send along with the request.
  * If the content-type header is set to 'application/json',
  * than this data will be stringified through JSON.stringify().
  * Otherwise the data will be parsed as an url encoded form string
  * from the first-level key/value pairs.
  * @returns {Promise.<Constr>} Returns a Promise with the constructed object on success.
  */
  toObject(Constr, data) {
    return this.send(data)
      .then(res => new Constr(JSON.parse(res)));
  }

  toObjectArray(Constr, data) {
    return this.send(data)
      .then((res) => {
        const json = JSON.parse(res);
        const arr = [];

        let i;
        for (i = 0; i < json.length; i += 1) {
          arr.push(new Constr(json[i]));
        }

        return arr;
      });
  }

  toString(data) {
    return this.send(data)
      .then(res => `${res}`);
  }

  toJson(data) {
    return this.send(data)
      .then(res => JSON.parse(res));
  }

  sendBrowser(data) {
    return new Promise((resolve, reject) => {
      // setup a xmlhttprequest to handle the http request
      const req = new XMLHttpRequest();
      req.open(this.method || Request.defaults.method, this.url.toString());
      req.timeout = this.timeout || Request.defaults.timeout;

      // set the headers
      const headers = Object.assign({}, Request.defaults.headers, this.headers);
      Object.keys(headers).forEach((headerName) => {
        if (typeof headers[headerName] === 'string' || typeof headers[headerName] === 'number') {
          req.setRequestHeader(headerName, headers[headerName]);
        }
      });

      req.onerror = (event) => {
        reject(event);
      };

      req.ontimeout = (event) => {
        reject(event);
      };

      req.onload = () => {
        if (req.status >= 200 && req.status < 300) {
          resolve(req.responseText);
        } else {
          const err = new Error('Unsuccessful statuscode returned');
          err.statusCode = req.status;
          err.data = req.responseText;
          reject(err);
        }
      };

      req.send(data);
    });
  }

  sendNode(data) {
    return new Promise((resolve, reject) => {
      const options = url.parse(this.url.toString());
      options.method = this.method || Request.defaults.method;
      options.headers = Object.assign({}, Request.defaults.headers, this.headers);
      options.rejectUnauthorized = typeof this.rejectUnauthorized === 'boolean' ? this.rejectUnauthorized : Request.defaults.rejectUnauthorized;

      const protocolName = options.protocol.substring(0, options.protocol.length - 1).toLowerCase();
      if (protocolName !== 'http' && protocolName !== 'https') {
        throw new Error(`unsupported protocol "${protocolName}"`);
      }

      const req = (protocolName === 'https' ? https : http).request(options, (res) => {
        res.setEncoding('utf8');
        let resData = '';
        res.on('data', (chunk) => {
          resData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(resData);
          } else {
            const err = new Error('Unsuccessful statuscode returned');
            err.statusCode = res.statusCode;
            err.data = resData;
            reject(err);
          }
        });
      });

      req.setTimeout(this.timeout || Request.defaults.timeout, () => {
        req.abort();
        reject(new Error('timeout'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (data) {
        req.write(data, () => {
          req.end();
        });
      } else {
        req.end();
      }
    });
  }

  send(data) {
    if (data && typeof data !== 'string') {
      const contentType = this.headers['content-type'] || Request.defaults.headers['content-type'];
      if (contentType === 'application/json') {
        data = JSON.stringify(data);
      } else {
        let dataStr = '';
        for (const name in data) {
          if (dataStr.length) {
            dataStr += '&';
          }
          dataStr += `${encodeURIComponent(name)}=${encodeURIComponent(data[name])}`;
        }
        data = dataStr;
      }
    }

    // auto setting of content-length header
    if (data && !this.headers['content-length'] &&
      ((typeof this.autoContentLength !== 'boolean' && Request.defaults.autoContentLength === true) ||
      this.autoContentLength === true)
    ) {
      this.headers['content-length'] = utf8ByteLength(data);
    }

    if (typeof window === 'undefined') {
      return this.sendNode(data);
    }
    return this.sendBrowser(data);
  }

}

Request.defaults = {
  headers: {
    'content-type': 'application/json'
  },
  method: 'GET',
  timeout: 60000,
  rejectUnauthorized: true,
  autoContentLength: false
};

class Base {

  constructor(obj) {
    this.headers = {};
    this.rejectUnauthorized = null;
    this.timeout = null;
    this.autoContentLength = null;

    if (typeof obj === 'string' || (obj instanceof Url)) {
      this.url = obj;
    } else if (obj) {
      Object.assign(this, obj);
    }

    if (this.url && !(this.url instanceof Url)) {
      this.url = new Url(this.url);
    }
  }

  request(method, reqUrl) {
    if (!(reqUrl instanceof Url)) {
      reqUrl = new Url(reqUrl);
    }
    let baseUrl = this.url;
    if (!(baseUrl instanceof Url)) {
      baseUrl = new Url(baseUrl);
    }
    reqUrl.mergeFrom(baseUrl);
    const req = new Request(method, reqUrl.toString());

    Object.assign(req.headers, this.headers);
    req.rejectUnauthorized = this.rejectUnauthorized;
    req.timeout = this.timeout;
    req.autoContentLength = this.autoContentLength;

    return req;
  }

}

module.exports = {
  Request,
  Base,
  Url
};

},{"http":1,"https":1,"url":1}],4:[function(require,module,exports){
'use strict';

module.exports = () => {
  class Connector {
    constructor(obj) {
      if (obj) {
        Object.assign(this, obj);

        this.origin = null;
        this.destination = null;
        this.setOrigin(obj.origin, true);
        this.setDestination(obj.destination, true);

        // trigger attachment functions
        // after both points have been set.
        if (this.origin) {
          this.origin.emit('attach', this);
        }
        if (this.destination) {
          this.destination.emit('attach', this);
        }

        if (obj.type) {
          this.setType(obj.type);
        }
      }
    }

    setType(type) {
      this.type = type;
    }

    filterDuplicateConnectors(type, end) {
      const otherType = (type === 'origin' ? 'destination' : 'origin');
      end.connectors
      .filter(conn => conn[otherType] === this[otherType])
      .forEach(conn => conn.delete());
    }

    setEnd(type, end, noEmit) {
      // remove from old origin
      let endConnectorIndex;
      if (this[type] && (endConnectorIndex = this[type].connectors.indexOf(this)) > -1) {
        this[type].connectors.splice(endConnectorIndex, 1);
        this[type].emit('detach', this);
      }

      this[type] = end;
      if (!end) {
        return null;
      }

      this.setType(end.type);

      // disallow multiple connectors with same origin and destination
      this.filterDuplicateConnectors(type, end);

      end.connectors.push(this);

      // trigger attachment functions
      if (!noEmit) {
        end.emit('attach', this);
      }

      return end;
    }

    setOrigin(origin, noEmit) {
      this.setEnd('origin', origin, noEmit);
    }

    setDestination(destination, noEmit) {
      this.setEnd('destination', destination, noEmit);
    }

    delete() {
      this.setOrigin(null);
      this.setDestination(null);
    }
  }

  return Connector;
};

},{}],5:[function(require,module,exports){
'use strict';

module.exports = (XIBLE) => {
  const EventEmitter = require('events').EventEmitter;

  var FLOWS = [];

  class Flow extends EventEmitter {
    constructor(obj) {
      super();

      this._id = null;
      this.state = Flow.STATE_STOPPED;

      if (obj) {
        Object.assign(this, obj);
      }

      this.removeAllListeners();

      // setup viewstate
      this.viewState = {
        left: obj && obj.viewState && obj.viewState.left ? obj.viewState.left : 0,
        top: obj && obj.viewState && obj.viewState.top ? obj.viewState.top : 0,
        zoom: obj && obj.viewState && obj.viewState.zoom ? obj.viewState.zoom : 1,
        backgroundLeft: obj && obj.viewState &&
          obj.viewState.backgroundLeft ? obj.viewState.backgroundLeft : 0,
        backgroundTop: obj && obj.viewState &&
          obj.viewState.backgroundTop ? obj.viewState.backgroundTop : 0
      };

      // setup nodes
      if (obj && obj.nodes) {
        this.initNodes(obj.nodes);
      } else {
        this.nodes = [];
      }

      // setup connectors
      if (obj && obj.connectors) {
        this.initConnectors(obj.connectors);
      } else {
        this.connectors = [];
      }
    }

    initNodes(nodes) {
      this.nodes = [];
      nodes.forEach(node => this.addNode(new XIBLE.Node(node)));
    }

    initConnectors(connectors) {
      this.connectors = [];
      connectors.forEach((conn) => {
        conn.origin = this.getOutputById(conn.origin);
        conn.destination = this.getInputById(conn.destination);

        this.addConnector(new XIBLE.Connector(conn));
      });
    }

    static getById(id) {
      return Promise.resolve(FLOWS[id]);
    }

    static getAll() {
      return Promise.resolve(FLOWS);
    }

    static get STATE_STOPPED() {
      return 0;
    }

    delete() {
      this.undirect();

      if (!this._id) {
        return Promise.resolve();
      }

      this.emit('delete');

// TODO delete
      return Promise.resolve();
    }

    save(asNew) {
      this.undirect();

      return new Promise((resolve, reject) => {
        resolve(this);
// TODO generate id
//this._id = reqJson._id;
//const json = this.toJson();
      });
    }

    undirect() {
      this.emit('undirect');
    }

    direct(related) {
      // throttle
      if (this._lastPostDirectFunction || this._lastDirectPromise) {
        const hasFunction = !!this._lastPostDirectFunction;

        this._lastPostDirectFunction = () => {
          this.direct(related);
          this._lastPostDirectFunction = null;
        };

        if (!hasFunction) {
          this._lastDirectPromise.then(this._lastPostDirectFunction);
        }

        return Promise.resolve();
      }

      // ensure this flow is saved first
      if (!this._id) {
        return this.save()
        .then(() => this.direct(related));
      }

      if (!related) {
        return Promise.reject('related argument missing');
      }

      this._lastDirectPromise = new Promise((resolve, reject) => {
        const nodes = related.nodes.map(node => ({
          _id: node._id,
          data: node.data
        }));

        const req = XIBLE.http.request('PATCH', `/api/flows/${encodeURIComponent(this._id)}/direct`);
        req.toString(nodes)
        .then(() => {
          resolve(this);
          this._lastDirectPromise = null;

          this.emit('direct');
        })
        .catch((err) => {
          reject(err);
        });
      });

      return this._lastDirectPromise;
    }

    // TODO: this functions isn't 'pretty'
    // and it should be toJSON().
    toJson(nodes, connectors) {
      // the nodes
      const NODE_WHITE_LIST = ['_id', 'name', 'type', 'left', 'top', 'inputs', 'outputs', 'hidden', 'global'];
      let dataObject;
      let inputsObject;
      let outputsObject;
      const nodeJson = JSON.stringify(nodes || this.nodes, function jsonStringify(key, value) {
        switch (key) {
          case 'inputs':
            inputsObject = value;
            return value;

          case 'outputs':
            outputsObject = value;
            return value;

          case 'data':
            if (this !== inputsObject && this !== outputsObject) {
              dataObject = value;
              return value;
            }

          default: // eslint-disable-line no-fallthrough
            if (this !== inputsObject && this !== outputsObject && this !== dataObject
              && key && isNaN(key) && NODE_WHITE_LIST.indexOf(key) === -1
            ) {
              return; // eslint-disable-line consistent-return
            }
            return value;
        }
      });

      // the connectors
      const CONNECTOR_WHITE_LIST = ['_id', 'origin', 'destination', 'type', 'hidden'];
      const connectorJson = JSON.stringify(connectors || this.connectors, (key, value) => {
        if (key && isNaN(key) && CONNECTOR_WHITE_LIST.indexOf(key) === -1) {
          return;
        } else if (value && (key === 'origin' || key === 'destination')) {
          return value._id; // eslint-disable-line consistent-return
        }
        return value; // eslint-disable-line consistent-return
      });

      return `{"_id":${JSON.stringify(this._id)},"nodes":${nodeJson},"connectors":${connectorJson},"viewState":${JSON.stringify(this.viewState)}}`;
    }

    /**
    * Sets the viewstate of a flow
    * @param {Object} viewState
    * @param {Number} viewState.left
    * @param {Number} viewState.top
    * @param {Number} viewState.backgroundLeft
    * @param {Number} viewState.backgroundTop
    * @param {Number} viewState.zoom
    */
    setViewState(viewState) {
      this.viewState = viewState;
    }

    getNodeById(id) {
      return this.nodes.find(node => node._id === id);
    }

    addConnector(connector) {
      if (connector.flow) {
        throw new Error('connector already hooked up to other flow');
      }

      this.connectors.push(connector);
      connector.flow = this;
      return connector;
    }

    deleteConnector(connector) {
      const index = this.connectors.indexOf(connector);
      if (index > -1) {
        this.connectors.splice(index, 1);
      }
      connector.flow = null;
    }

    addNode(node) {
      if (node.flow) {
        throw new Error('node already hooked up to other flow');
      }

      this.nodes.push(node);
      node.flow = this;

      return node;
    }

    deleteNode(node) {
      const index = this.nodes.indexOf(node);
      if (index > -1) {
        this.nodes.splice(index, 1);
      }
      node.flow = null;
    }

    getInputById(id) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.inputs) {
          if (node.inputs[name]._id === id) {
            return node.inputs[name];
          }
        }
      }
      return null;
    }

    getOutputById(id) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.outputs) {
          if (node.outputs[name]._id === id) {
            return node.outputs[name];
          }
        }
      }
      return null;
    }

    /**
    * returns an array of all nodes in this flow that contain at least one global output
    * @returns {Node[]} list of nodes
    */
    getGlobalNodes() {
      return this.nodes.filter(node => node.getOutputs().some(output => output.global));
    }

    /**
    * returns an array of all outputs in this flow that are global
    * @returns {Output[]} list of nodes
    */
    getGlobalOutputs() {
      let globalOutputs = [];
      for (let i = 0; i < this.nodes.length; i += 1) {
        globalOutputs = globalOutputs.concat(this.nodes[i].getGlobalOutputs());
      }
      return globalOutputs;
    }

    removeAllStatuses() {
      this.nodes.forEach((node) => {
        node.removeAllStatuses();
      });
    }
  }

  return Flow;
};

},{"events":2}],6:[function(require,module,exports){
'use strict';

module.exports = (XIBLE) => {
  class Input extends XIBLE.NodeIo {
    delete() {
      super.delete();

      if (this.node) {
        this.node.deleteInput(this);
      }
    }

    matchesConnectors(connectors) {
      if (!connectors) {
        return false;
      }

      const connector = connectors[0];
      return this.matchesTypeDef(connector)
      .then(matchesTypeDef =>
        this.node !== connector.origin.node &&
        (
          (!this.type && connector.origin.type !== 'trigger') ||
          (!connector.origin.type && this.type !== 'trigger') ||
          connector.origin.type === this.type || matchesTypeDef
        )
      );
    }
  }

  return Input;
};

},{}],7:[function(require,module,exports){
'use strict';

module.exports = (XIBLE) => {
  const EventEmitter = require('events').EventEmitter;

  class Io extends EventEmitter {
    constructor(name, obj) {
      super();

      if (obj) {
        Object.assign(this, obj);
      }

      this.removeAllListeners();

      this.connectors = [];

      if (!this._id) {
        this._id = XIBLE.generateObjectId();
      }

      this.setName(name);

      this.setType(this.type);

      if (typeof this.singleType === 'boolean' && this.singleType && !this.type) {
        this.setSingleType(this.singleType);
      }

      if (typeof this.maxConnectors === 'number') {
        this.setMaxConnectors(this.maxConnectors);
      }

      if (typeof this.assignsOutputType === 'string') {
        this.on('settype', () => {
          if (!this.node) {
            return;
          }
          this.node.getOutputByName(this.assignsOutputType)
          .setType(this.type);
        });
      }

      if (typeof this.assignsInputType === 'string') {
        this.on('settype', () => {
          if (!this.node) {
            return;
          }
          this.node.getInputByName(this.assignsInputType)
          .setType(this.type);
        });
      }

      if (this.hidden) {
        this.hide();
      }

      if (this.global) {
        this.setGlobal(true);
      }
    }

    /**
    * If this is set to true, and type===null,
    * it's verified that only one type of connector is hooked up.
    * @param {Boolean} singleType
    */
    setSingleType(bool) {
      this.singleType = bool;

      // TODO: unhook eventlisteners when changing singleType

      if (this.singleType) {
        this.on('attach', (conn) => {
          const connLoc = conn[this instanceof XIBLE.NodeInput ? 'origin' : 'destination'];
          if (connLoc && connLoc.type) {
            this.setType(connLoc.type);
          }
        });

        this.on('detach', () => {
          if (!this.connectors.length) {
            this.setType(null);
          }
        });
      }

      this.verifyConnectors();
    }

    setGlobal(global) {
      this.global = global;
      return this;
    }

    setMaxConnectors(max) {
      this.maxConnectors = max;
      this.verifyConnectors();

      return this;
    }

    setType(type) {
      if (this.type === type) {
        return this;
      }

      // set new type
      this.type = type;
      this.verifyConnectors();
      this.emit('settype', type);

      return this;
    }

    setName(name) {
      if (!name) {
        throw new Error('the \'name\' argument is missing');
      }

      this.name = name;
      return this;
    }

    /**
    * Verifies whether a connector matches the typedef on the NodeIo
    * @param {Connector}
    * @returns {Promise.<Boolean>}
    */
    matchesTypeDef(connector) {
      return XIBLE.TypeDef.getAll()
      .then((typeDefs) => {
        const outGoing = this instanceof XIBLE.NodeOutput;
        const originTypeDef = typeDefs[(outGoing ? this.type : connector.origin.type)];
        const destinationTypeDef = typeDefs[(outGoing ? connector.destination.type : this.type)];

        if (!destinationTypeDef || !originTypeDef) {
          return false;
        }
        return destinationTypeDef.matches(originTypeDef);
      });
    }

    verifyConnectors() {
      // remove connectors if we have too many
      // always removes the latest added conns
      if (typeof this.maxConnectors === 'number') {
        while (this.connectors.length > this.maxConnectors) {
          this.connectors[this.connectors.length - 1].delete();
        }
      }

      // verify type
      const end = this instanceof XIBLE.NodeInput ? 'origin' : 'destination';
      if (this.type) {
        this.connectors
        .filter(conn => conn[end].type && conn[end].type !== this.type)
        .forEach(conn => conn.delete());
      }
    }

    hide() {
      this.hidden = true;
      return this;
    }

    unhide() {
      this.hidden = false;
      return this;
    }

    delete() {
      while (this.connectors.length) {
        this.connectors[0].delete();
      }

      if (this.node && this instanceof XIBLE.NodeInput) {
        delete this.node.inputs[this.name];
      }

      if (this.node && this instanceof XIBLE.NodeOutput) {
        delete this.node.outputs[this.name];
      }
    }
  }

  return Io;
};

},{"events":2}],8:[function(require,module,exports){
'use strict';

module.exports = (XIBLE) => {
  const EventEmitter = require('events').EventEmitter;

  const NODES = [];

  class Node extends EventEmitter {
    constructor(obj = {}, ignoreData = false) {
      super();

      Object.assign(this, obj);
      this.removeAllListeners();

      if (!this._id) {
        this._id = XIBLE.generateObjectId();
      }

      // copy data
      this.data = null;
      if (obj.data && !ignoreData) {
        this.data = Object.assign({}, obj.data);
      } else {
        this.data = {};
      }

      // add inputs
      this.initInputs(obj.inputs);

      // add outputs
      this.initOutputs(obj.outputs);

      this.setPosition(obj.left, obj.top);
    }

    initInputs(inputs) {
      this.inputs = {};
      if (inputs) {
        for (const name in inputs) {
          this.addInput(new XIBLE.NodeInput(name, inputs[name]));
        }
      }
    }

    initOutputs(outputs) {
      this.outputs = {};
      if (outputs) {
        for (const name in outputs) {
          this.addOutput(new XIBLE.NodeOutput(name, outputs[name]));
        }
      }
    }

    static register(nodeName, nodeDef) {
      NODES[nodeName] = new Node(nodeDef);
    }

    static getAll() {
      return Promise.resolve(NODES);
    }

    static getAllInputObjectNodes(node) {
      const resultNodes = [node];
      const resultConnectors = [];
      const objectInputs = node.getInputs().filter(input => input.type !== 'trigger');
      objectInputs.forEach((objectInput) => {
        resultConnectors.push(...objectInput.connectors);
        objectInput.connectors.forEach((connector) => {
          const objs = Node.getAllInputObjectNodes(connector.origin.node);
          resultNodes.push(...objs.nodes);
          resultConnectors.push(...objs.connectors);
        });
      });

      return {
        nodes: resultNodes,
        connectors: resultConnectors
      };
    }

    setData(attr, value) {
      if (typeof value === 'undefined') {
        Object.assign(this.data, attr);
      } else {
        this.data[attr] = value;
      }

      this.emit('setdata', attr, value);
      return this;
    }

    getData(attr) {
      return this.data[attr];
    }

    getEditorContent() {
      const req = XIBLE.http.request('GET', `/nodes/${encodeURIComponent(this.name)}/editor/index.htm`);
      return req.toString();
    }

    setPosition(left = 0, top = 0) {
      this.left = left;
      this.top = top;

      this.emit('position', this);
    }

    addInput(input) {
      this.addIo(input);
      this.inputs[input.name] = input;

      return input;
    }

    addOutput(output) {
      this.addIo(output);
      this.outputs[output.name] = output;

      return output;
    }

    addIo(child) {
      child.node = this;

      if (!child._id) {
        child._id = XIBLE.generateObjectId();
      }

      child.node = this;
      return child;
    }

    deleteInput(input) {
      delete this.inputs[input.name];
      input.node = null;

      return input;
    }

    deleteOutput(output) {
      delete this.outputs[output.name];
      output.node = null;

      return output;
    }

    delete() {
      for (const name in this.inputs) {
        this.inputs[name].delete();
      }

      for (const name in this.outputs) {
        this.outputs[name].delete();
      }

      if (this.flow) {
        const nodeIndex = this.flow.nodes.indexOf(this);
        if (nodeIndex > -1) {
          this.flow.nodes.splice(nodeIndex, 1);
        }
      }
    }

    getInputByName(name) {
      return this.inputs[name];
    }

    getOutputByName(name) {
      return this.outputs[name];
    }

    getInputs() {
      return Object.keys(this.inputs)
      .map(key => this.inputs[key]);
    }

    getOutputs() {
      return Object.keys(this.outputs)
      .map(key => this.outputs[key]);
    }

    getGlobalOutputs() {
      return this.getOutputs().filter(output => output.global);
    }

    getInputsByType(type = null) {
      const inputs = [];
      for (const name in this.inputs) {
        if (this.inputs[name].type === type) {
          inputs.push(this.inputs[name]);
        }
      }
      return inputs;
    }

    getOutputsByType(type = null) {
      const outputs = [];
      for (const name in this.outputs) {
        if (this.outputs[name].type === type) {
          outputs.push(this.outputs[name]);
        }
      }
      return outputs;
    }

    removeAllStatuses() { // eslint-disable-line class-methods-use-this
    }
  }

  return Node;
};

},{"events":2}],9:[function(require,module,exports){
'use strict';

module.exports = (XIBLE) => {
  class Output extends XIBLE.NodeIo {
    delete() {
      super.delete();

      if (this.node) {
        this.node.deleteOutput(this);
      }
    }

    matchesConnectors(connectors) {
      if (!connectors) {
        return false;
      }

      const connector = connectors[0];
      return this.matchesTypeDef(connector)
      .then(matchesTypeDef =>
        this.node !== connector.destination.node &&
        (
          (!this.type && connector.destination.type !== 'trigger') ||
          (!connector.destination.type && this.type !== 'trigger') ||
          connector.destination.type === this.type || matchesTypeDef
        )
      );
    }
  }

  return Output;
};

},{}],10:[function(require,module,exports){
'use strict';

module.exports = (XIBLE) => {
  let TYPE_DEFS = [];

  class TypeDef {
    constructor(obj) {
      if (obj) {
        Object.assign(this, obj);
      }
    }

    /**
    * Verifies whether the given typeDef matches this typeDef.
    * If not matched directly, the extends property (-tree) of the given typeDef
    * is verified against this typeDef.
    * @returns {Boolean}
    */
    matches(typeDef) {
      if (typeDef === this) {
        return true;
      } else if (!typeDef || !typeDef.extends) {
        return false;
      }

      // check for extends
      if (typeof typeDef.extends === 'string') {
        const extendsTypeDef = TYPE_DEFS[typeDef.extends];
        if (!extendsTypeDef) {
          return false;
        }

        return this.matches(extendsTypeDef);
      } else if (Array.isArray(typeDef.extends)) {
        for (let i = 0; i < typeDef.extends.length; i += 1) {
          const extendsTypeDef = TYPE_DEFS[typeDef.extends[i]];
          if (!extendsTypeDef) {
            continue;
          }

          if (this.matches(extendsTypeDef)) {
            return true;
          }
        }
      }

      return false;
    }

    static register(typeDefName, typeDef) {
      TYPE_DEFS[typeDefName] = new TypeDef(typeDef);
    }

    /**
    * Retrieves all typeDefs from the XIBLE API.
    * @returns {Promise.<TypeDef[]>}
    */
    static getAll() {
      return Promise.resolve(TYPE_DEFS);
    }
  }

  return TypeDef;
};

},{}],11:[function(require,module,exports){
'use strict';

const xibleWrapper = require('./wrapperinstance.js');

class XibleEditorConnector extends xibleWrapper.Connector {
  constructor(obj) {
    // create the connector HTML/SVG elements
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.classList.add('connector');
    const path = el.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));

    super(Object.assign({}, obj, { element: el }));

    // selection handlers
    path.addEventListener('mousedown', event => this.editor.toggleSelectionOnMouseEvent(event, this));
    path.addEventListener('mouseup', event => this.editor.toggleSelectionOnMouseEvent(event, this));
  }

  setType(type) {
    if (this.type) {
      this.element.firstChild.classList.remove(this.type);
    }

    super.setType(type);
    this.element.firstChild.classList.add(this.type);
  }

  filterDuplicateConnectors(type, end) {
    if (
      !this.editor || !this.editor.dummyXibleConnectors ||
      this.editor.dummyXibleConnectors.indexOf(this) === -1
    ) {
      super.filterDuplicateConnectors(type, end);
    }
  }

  setOrigin(origin) {
    if (this.origin && this.origin.connectors.indexOf(this) > -1) {
      this.origin.node.removeListener('position', this.originDrawFn);
    }

    super.setOrigin(origin);

    if (!origin) {
      return null;
    }

    this.draw();

    // redraw on move of origin
    this.origin.node.on('position', this.originDrawFn = this.draw.bind(this));

    return origin;
  }

  setDestination(destination) {
    if (this.destination && this.destination.connectors.indexOf(this) > -1) {
      this.destination.node.removeListener('position', this.destinationDrawFn);

      // find global conns with same type
      if (this.destination.global !== false && this.destination.connectors.length === 1 && this.destination.type && document.querySelector(`.output>.${this.destination.type.replace(/\./g, '\\.')}.global`)) {
        this.destination.setGlobal(true);
      }
    }

    super.setDestination(destination);

    if (!destination) {
      return null;
    }

    this.draw();

    // redraw on move of origin
    this.destination.node.on('position', this.destinationDrawFn = this.draw.bind(this));

    return destination;
  }

  /**
  * Recalculates and writes/draws all values of a connector,
  * relative to the start- and end-point.
  * @returns {Boolean} Returns false if no action was taken, true otherwise.
  */
  draw() {
    const { element: el, origin, destination } = this;

    // only continue if both sides are known
    if (destination && origin) {
      el.style.visibility = '';
    } else {
      el.style.visibility = 'none';
      return false;
    }

    if (!el.parentNode) {
      return false;
    }

    // get the position of the output
    const originNodeStyle = getComputedStyle(origin.node.element);
    const originLeft = origin.node.left + origin.element.offsetLeft + origin.element.offsetWidth +
      parseInt(originNodeStyle.borderLeftWidth, 10) +
      parseInt(originNodeStyle.paddingLeft, 10);
    const originTop = origin.node.top + origin.element.offsetTop;

    // get the position of the input
    const destinationNodeStyle = getComputedStyle(destination.node.element);
    const destinationLeft = destination.node.left + destination.element.offsetLeft +
      parseInt(destinationNodeStyle.borderLeftWidth, 10) +
      parseInt(destinationNodeStyle.paddingLeft, 10);
    const destinationTop = destination.node.top + destination.element.offsetTop;

    // get the distances between input and output
    const height = Math.abs(originTop - destinationTop);
    const width = Math.abs(originLeft - destinationLeft);

    // calculate the tension
    const maxTension = 100;
    const minTension = 0;
    let tension = Math.floor((width / 3) + (height / 3));

    if (originLeft - destinationLeft < 0) {
      tension = tension > maxTension
        ? maxTension
        : tension;
    }

    tension = tension < minTension
      ? minTension
      : tension;

    // update the path for the bezier curve
    const startX = destinationLeft > originLeft
      ? (tension / 2)
      : width + (tension / 2);
    const endX = destinationLeft > originLeft
      ? destinationLeft - originLeft + (tension / 2)
      : 0 + (tension / 2);
    const startY = destinationTop > originTop
      ? 10
      : height + 10;
    const endY = destinationTop > originTop
      ? destinationTop - originTop + 10
      : 10;
    el.firstChild.setAttribute('d', `M${startX},${startY} C${startX + tension},${startY} ${endX - tension},${endY} ${endX},${endY}`);

    // calc the x/y position of the svg element
    let left = originLeft < destinationLeft
      ? originLeft
      : destinationLeft;
    const top = (originTop < destinationTop
      ? originTop
      : destinationTop) + 1;

    // apply tension to left position of svg
    left -= (tension / 2);

    // update the location and size of the svg
    el.style.transform = `translate(${left}px, ${top}px)`;
    el.style.width = `${width + tension}px`;
    el.style.height = `${height + 20}px`;

    this.top = top;
    this.left = left;

    return true;
  }

  delete() {
    super.delete();

    if (this.editor) {
      this.editor.deleteConnector(this);
    }
  }
}

module.exports = XibleEditorConnector;

},{"./wrapperinstance.js":17}],12:[function(require,module,exports){
'use strict';

const xibleWrapper = require('./wrapperinstance.js');

const XibleEditorNode = require('./XibleEditorNode.js');
const XibleEditorConnector = require('./XibleEditorConnector.js');

class XibleEditorFlow extends xibleWrapper.Flow {
  constructor(obj) {
    super(obj);

    // set global appropriately when it's changed
    this.on('global', (output) => {
      this.setGlobalFromOutput(output);
    });
  }

  setGlobalFromOutput(output) {
    // if we have another global of this type, ignore
    let globalOutputsByType = this.getGlobalOutputs()
    .filter(gOutput => gOutput.type === output.type);
    if (
      (!output.global && globalOutputsByType.length) ||
      (output.global && globalOutputsByType.length > 1)
    ) {
      return;
    }
    globalOutputsByType = null;

    for (let i = 0; i < this.nodes.length; i += 1) {
      this.nodes[i].getInputs().forEach((input) => {
        if (
          input.type === output.type && !input.connectors.length &&
          input.global !== false
        ) {
          input.setGlobal(output.global ? true : undefined);
        }
      });
    }
  }

  initNodes(nodes) {
    this.nodes = [];
    nodes.forEach(node => this.addNode(new XibleEditorNode(node)));
  }

  initConnectors(connectors) {
    this.connectors = [];
    connectors.forEach((conn) => {
      conn.origin = this.getOutputById(conn.origin);
      conn.destination = this.getInputById(conn.destination);

      this.addConnector(new XibleEditorConnector(conn));
    });
  }

  undirect() {
    super.undirect();

    this.nodes.forEach((node) => {
      node.element.classList.remove('nodirect');

      if (node._directSetDataListener) {
        node.removeListener('setdata', node._directSetDataListener);
        delete node._directSetDataListener;
      }
    });

    this.connectors.forEach((connector) => {
      connector.element.classList.remove('nodirect');
    });
  }

  direct(related) {
    super.direct(related);

    // TODO: set related styling here instead of in XibleEditor where it is now
  }

  // TODO: simply have XibleEditor set viewState to loadedFlow directly?
  toJson(nodes, connectors) {
    // the viewstate
    this.setViewState({
      left: this.editor.left,
      top: this.editor.top,
      zoom: this.editor.zoom,
      backgroundLeft: this.editor.backgroundLeft,
      backgroundTop: this.editor.backgroundTop
    });

    return super.toJson(nodes, connectors);
  }
}

module.exports = XibleEditorFlow;

},{"./XibleEditorConnector.js":11,"./XibleEditorNode.js":13,"./wrapperinstance.js":17}],13:[function(require,module,exports){
'use strict';

const xibleWrapper = require('./wrapperinstance.js');
const XibleEditorConnector = require('./XibleEditorConnector.js');

class XibleEditorNode extends xibleWrapper.Node {
  constructor(obj, ignoreData) {
    const el = document.createElement('div');
    el.classList.add('node');

    const headerEl = el.appendChild(document.createElement('h1'));

    // add ios
    const ios = el.appendChild(document.createElement('div'));
    ios.classList.add('io');

    // add input list
    const inputList = ios.appendChild(document.createElement('ul'));
    inputList.classList.add('input');

    // add output list
    const outputList = ios.appendChild(document.createElement('ul'));
    outputList.classList.add('output');

    super(Object.assign({}, obj, {
      element: el,
      inputList,
      outputList
    }), ignoreData);

    headerEl.appendChild(document.createTextNode(this.name));

    // add additional content
    if (this.hostsEditorContent) { // load editor static hosted content for this node
      this.getAndProcessEditorContent();
    } else if (!this.nodeExists && obj.editorContent) {
      this.processEditorContent(obj.editorContent);
    }

    this.statusTimeouts = {};
    this.statusEl = null;

    // selection handlers
    this.element.addEventListener('mousedown', (event) => {
      if (this.editor) {
        this.editor.toggleSelectionOnMouseEvent(event, this);
      }
    });
    this.element.addEventListener('mouseup', (event) => {
      if (this.editor) {
        this.editor.toggleSelectionOnMouseEvent(event, this);
      }
    });

    if (!obj.nodeExists) {
      this.element.classList.add('fail');
      this.addStatus({
        _id: 1,
        color: 'red',
        message: 'This node does not exist in this configuration'
      });
    }
  }

  initInputs(inputs) {
    this.inputs = {};
    if (inputs) {
      for (const name in inputs) {
        this.addInput(new XibleEditorNodeInput(name, inputs[name]));
      }
    }
  }

  initOutputs(outputs) {
    this.outputs = {};
    if (outputs) {
      for (const name in outputs) {
        this.addOutput(new XibleEditorNodeOutput(name, outputs[name]));
      }
    }
  }

  getAndProcessEditorContent() {
    const proc = () => {
      this.getEditorContent().then((data) => {
        this.processEditorContent(data);
      });
    };

    if (this.editor) {
      proc();
    } else {
      this.once('beforeAppend', proc);
    }
  }

  processEditorContent(content) {
    this.editorContent = content;

    const proc = () => {
      const div = document.createElement('div');
      div.classList.add('content');

      // if attachShadow shadow DOM v1) is not supported, simply don't show contents
      if (typeof div.attachShadow !== 'function') {
        return;
      }

      // create the shadow and set the contents including the nodeContent.css
      const shadow = div.attachShadow({
        mode: 'open'
      });
      shadow.innerHTML = `<style>@import url("css/nodeContent.css");</style>${this.editorContent}`;

      // check if style element has loaded
      let stylesLoaded = false;
      let scriptsLoaded = false;
      let emittedLoad = false;

      // emit a load event
      const checkForEmitLoad = () => {
        if (!emittedLoad && stylesLoaded && scriptsLoaded) {
          this.emit('editorContentLoad');
          emittedLoad = true;
        }
      };

      // hook an eventlistener to check if the style element has loaded
      const styleEl = shadow.querySelector('style');
      styleEl.onload = () => {
        stylesLoaded = true;
        checkForEmitLoad();
      };

      // append the div & shadowroot to the node
      this.element.appendChild(div);
      this.editorContentEl = shadow;

      // trigger some convenience stuff
      this.convenienceLabel();
      this.convenienceHideIfAttached();
      this.convenienceOutputValue();

      // run script elements
      Array.from(shadow.querySelectorAll('script'))
      .forEach((scriptEl) => {
        new Function('window', 'document', scriptEl.textContent).call(this, null, shadow); // eslint-disable-line no-new-func
      });

      scriptsLoaded = true;
      checkForEmitLoad();
    };

    if (this.editor) {
      proc();
    } else {
      this.once('beforeAppend', proc);
    }
  }

  setPosition(left = 0, top = 0) {
    super.setPosition(left, top);
    this.element.style.transform = `translate(${this.left}px, ${this.top}px)`;
  }

  duplicate(ignoreData) {
    const duplicateXibleNode = new XibleEditorNode(this, ignoreData);
    duplicateXibleNode.flow = null;
    duplicateXibleNode.editor = null;

    // create a unique id for the node
    duplicateXibleNode._id = xibleWrapper.generateObjectId();

    // create a unique id for the inputs
    for (const name in duplicateXibleNode.inputs) {
      duplicateXibleNode.inputs[name]._id = xibleWrapper.generateObjectId();
    }

    // create a unique id for the outputs
    for (const name in duplicateXibleNode.outputs) {
      duplicateXibleNode.outputs[name]._id = xibleWrapper.generateObjectId();
    }

    return duplicateXibleNode;
  }

  addInput(input) {
    super.addInput(input);
    this.inputList.appendChild(input.element);

    return input;
  }

  addOutput(output) {
    super.addOutput(output);
    this.outputList.appendChild(output.element);

    return output;
  }

  deleteInput(input) {
    super.deleteInput(input);
    this.inputList.removeChild(input.element);
    return input;
  }

  deleteOuput(output) {
    super.deleteOuput(output);
    this.outputList.removeChild(output.element);
    return output;
  }

  delete() {
    if (this.editor) {
      this.editor.deleteNode(this);
    }

    super.delete();
  }

  addProgressBar(status) {
    if (!status || !status._id) {
      return;
    }

    let ul = this.statusEl;
    if (!ul) {
      ul = this.statusEl = this.element.appendChild(document.createElement('ul'));
      ul.classList.add('statuses');
    }

    const li = ul.appendChild(document.createElement('li'));
    li.setAttribute('data-statusid', status._id);
    li.classList.add('bar');

    if (status.message) {
      li.appendChild(document.createTextNode(status.message));
    }

    const statusBarHolder = li.appendChild(document.createElement('div'));
    statusBarHolder.classList.add('holder');
    statusBarHolder.appendChild(document.createElement('div'));

    if (status.timeout) {
      // check when this progressbar should start (future)
      // or when it started (past)
      const startDiff = Date.now() - status.startDate + this.editor.serverClientDateDifference;

      this.statusTimeouts[status._id] = window.setTimeout(() => {
        this.removeStatusById(status._id);
      }, status.timeout - startDiff);
    }

    this.updateProgressBarById(status._id, status);
  }

  updateProgressBarById(statusId, status) {
    if (!this.statusEl || !statusId || !status || typeof status.percentage !== 'number') {
      return;
    }

    const li = this.statusEl.querySelector(`li.bar[data-statusid="${statusId}"]`);
    if (li) {
      const bar = li.querySelector('.holder>div');
      bar.style.transition = 'none';
      bar.style.width = `${status.percentage}%`;

      if (status.updateOverTime) {
        // check when this progressbar should start (future)
        // or when it started (past)
        let startDiff = Date.now() - status.startDate + this.editor.serverClientDateDifference;

        // max it out
        if (startDiff > status.updateOverTime) {
          startDiff = status.updateOverTime;
        }

        // if this progressbar should have started in the past
        // calculate where the width should be right now
        if (startDiff > 0) {
          bar.style.width = `${startDiff / status.updateOverTime * 100}%`;
        }

        bar.offsetWidth; // eslint-disable-line
        bar.style.transition = `width ${status.updateOverTime - (startDiff > 0 ? startDiff : 0)}ms ${startDiff < 0 ? Math.abs(startDiff) : 0}ms linear`;
        bar.style.width = '100%';
      }
    }
  }

  addStatus(status) {
    if (!status || !status._id) {
      return;
    }

    Promise.resolve(0).then((configMaxStatuses) => {
      let statusCount = 0;
      let ul = this.statusEl;
      if (!ul) {
        ul = this.statusEl = this.element.appendChild(document.createElement('ul'));
        ul.classList.add('statuses');
      } else {
        statusCount = ul.querySelectorAll('li:not(.bar)').length;
      }

      // remove all statuses above the max config setting
      if (typeof configMaxStatuses === 'number' && statusCount >= configMaxStatuses && ul.firstChild) {
        while (statusCount >= configMaxStatuses && ul.firstChild) {
          const removeChild = ul.firstChild;
          this.removeStatusById(removeChild.getAttribute('data-statusid'));
          statusCount -= 1;
        }
      }

      if (configMaxStatuses === 0) {
        return;
      }

      const li = ul.appendChild(document.createElement('li'));
      li.setAttribute('data-statusid', status._id);

      if (status.color) {
        li.classList.add(status.color);
      }

      if (typeof status.message === 'string') {
        let messageLineSplit = status.message.split('\n');
        for (let i = 0; i < messageLineSplit.length; i += 1) {
          if (i) {
            li.appendChild(document.createElement('br'));
          }
          li.appendChild(document.createTextNode(messageLineSplit[i]));
        }
        messageLineSplit = null;
      }

      if (status.timeout) {
        this.statusTimeouts[status._id] = window.setTimeout(() => {
          this.removeStatusById(status._id);
        }, status.timeout);
      }
    });
  }

  updateStatusById(statusId, status) {
    if (!this.statusEl) {
      return;
    }

    const li = this.statusEl.querySelector(`li[data-statusid="${statusId}"]`);
    if (li) {
      if (status.message) {
        if (li.lastChild) {
          li.removeChild(li.lastChild);
        }

        li.appendChild(document.createTextNode(status.message));
      }
    }
  }

  removeStatusById(statusId, timeout) {
    // clear timeout
    if (this.statusTimeouts[statusId]) {
      window.clearTimeout(this.statusTimeouts[statusId]);
      this.statusTimeouts[statusId] = null;
      delete this.statusTimeouts[statusId];
    }

    // get and delete li
    if (this.statusEl) {
      const li = this.statusEl.querySelector(`li[data-statusid="${statusId}"]`);
      if (li) {
        const fn = () => {
          if (this.statusEl) {
            this.statusEl.removeChild(li);
          }
        };

        if (timeout) {
          window.setTimeout(fn, timeout);
        } else {
          fn();
        }
      }
    }
  }

  removeAllStatuses() {
    // clear all timeouts
    let statusId;
    for (statusId in this.statusTimeouts) {
      window.clearTimeout(this.statusTimeouts[statusId]);
      this.statusTimeouts[statusId] = null;
      delete this.statusTimeouts[statusId];
    }

    // destroy the el
    if (this.statusEl) {
      if (this.statusEl.parentNode) {
        this.statusEl.parentNode.removeChild(this.statusEl);
      }
      this.statusEl = null;
    }
  }

  setTracker(status) {
    if (this.removeTrackerTimeout) {
      window.clearTimeout(this.removeTrackerTimeout);
      this.removeTrackerTimeout = null;
    }

    if (this.trackerEl) {
      if (this.trackerEl.parentNode) {
        this.trackerEl.parentNode.removeChild(this.trackerEl);
      }
      this.trackerEl = null;
    }

    if (status) {
      const div = this.trackerEl = document.createElement('div');
      div.classList.add('tracker');

      if (status.color) {
        div.classList.add(status.color);
      }

      if (status.message) {
        this.element.appendChild(div).appendChild(document.createTextNode(status.message));
      }

      if (status.timeout) {
        this.removeTrackerTimeout = window.setTimeout(() => {
          this.setTracker();
        }, status.timeout);
      }
    }
  }

  getRootLabelElements() {
    return Array.from(this.editorContentEl.querySelectorAll(':host>label'));
  }

  getRootInputElements() {
    return Array.from(this.editorContentEl.querySelectorAll(':host>input, :host>selectcontainer'));
  }

  /**
  * Creates a label for every input/selectcontainer element that doesn't have one.
  */
  convenienceLabel() {
    this.getRootInputElements().forEach((el) => {
      const label = document.createElement('label');
      this.editorContentEl.replaceChild(label, el);
      label.appendChild(el);

      // copy the description to the label
      const description = el.getAttribute('data-description');
      if (description) {
        label.setAttribute('data-description', description);
      }

      // add the label
      let placeholder = el.getAttribute('placeholder') || el.getAttribute('data-outputvalue');
      const span = document.createElement('span');

      // try to fetch a placeholder for a select input
      if (!placeholder && el.nodeName === 'SELECTCONTAINER') {
        const selectEl = el.querySelector('select');
        if (selectEl) {
          placeholder = selectEl.getAttribute('placeholder') || selectEl.getAttribute('data-outputvalue');
        }
      }

      if (!placeholder) {
        span.classList.add('unknown');
      }

      span.appendChild(document.createTextNode(placeholder || 'unknown'));
      label.appendChild(span);

      // ensure hideif attached is hooked properly
      const hideIfAttached = el.getAttribute('data-hideifattached');
      if (hideIfAttached) {
        label.setAttribute('data-hideifattached', hideIfAttached);
      }
    });
  }

  convenienceOutputValue() {
    const els = Array.from(this.editorContentEl.querySelectorAll('[data-outputvalue]'));
    els.forEach((el) => {
      const attr = el.getAttribute('data-outputvalue');
      const type = el.getAttribute('type');

      // set the default value
      if (this.data[attr]) {
        if (type === 'checkbox' && el.getAttribute('value') === this.data[attr]) {
          el.checked = true;
        } else if (el.nodeName === 'SELECT') {
          Array.from(el.querySelectorAll('option')).forEach((option) => {
            if ((option.getAttribute('value') || option.textContent) === this.data[attr]) {
              option.selected = true;
            } else {
              option.selected = false;
            }
          });
        } else {
          el.setAttribute('value', this.data[attr]);
        }
      } else if (typeof this.data[attr] === 'undefined') {
        if (type === 'checkbox') {
          el.checked = false;
        } else {
          this.data[attr] = el.value;
        }
      }

      switch (type) {
        // hidden inputs don't trigger 'onchange' or 'oninput'
        case 'hidden': {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.attributeName === 'value') {
                this.setData(attr, el.value);
              }
            });
          });

          observer.observe(el, {
            attributes: true,
            childList: false,
            characterData: false
          });
          break;
        }

        // checkbox and radio both don't trigger input event
        case 'checkbox':
        case 'radio':
          el.addEventListener('change', () => {
            if (el.checked) {
              this.setData(attr, el.value);
            } else {
              this.setData(attr, null);
            }
          });
          break;

        default:
          el.addEventListener('input', () => {
            this.setData(attr, el.value);
          });
          break;
      }
    });
  }

  convenienceHideIfAttached() {
    const els = Array.from(this.editorContentEl.querySelectorAll('[data-hideifattached]'));
    els.forEach((el) => {
      const attr = el.getAttribute('data-hideifattached');
      let matchArray;
      const ioArray = [];

      const re = /(input|output)\s*\[\s*name\s*=\s*"?(\w*)"?\s*\]/g;
      while ((matchArray = re.exec(attr))) { // eslint-disable-line no-cond-assign
        const io = this[`${matchArray[1]}s`][matchArray[2]];
        if (io) {
          ioArray.push(io);

          if (io.connectors.length) {
            el.style.display = 'none';
          }

          io.on('attach', () => {
            el.style.display = 'none';
          });

          io.on('detach', () => {
            if (ioArray.every(io => !io.connectors.length)) {
              el.style.display = '';
            }
          });
        }
      }
    });
  }
}

const XibleEditorNodeIo = toExtend => class extends toExtend {
  constructor(name, obj) {
    const el = document.createElement('li');
    el.appendChild(document.createElement('div'));

    super(name, Object.assign({}, obj, {
      element: el
    }));

    // double click for global
    this.element.addEventListener('dblclick', () => {
      const globalValue = !this.global;
      if (
        this instanceof XibleEditorNodeInput &&
        !this.node.flow.getGlobalOutputs()
        .find(gOutput => gOutput.type === this.type)
      ) {
        return;
      }

      this.setGlobal(globalValue);
    });

    // enable mousedown -> mousemove handler for creating new connections
    this.enableHook();
  }

  setSingleType(bool) {
    super.setSingleType(bool);

    // TODO: unhook eventlisteners when changing singleType

    if (this.singleType) {
      this.on('attach', (conn) => {
        const connLoc = conn[this instanceof XibleEditorNodeInput ? 'origin' : 'destination'];
        if (connLoc && connLoc.type) {
          this.setType(connLoc.type);
        }
      });

      this.on('detach', () => {
        if (!this.connectors.length) {
          this.setType(null);
        }
      });
    }

    this.verifyConnectors();
  }

  setGlobal(global) {
    super.setGlobal(global);

    if (global) {
      this.element.classList.add('global');
    } else {
      this.element.classList.remove('global');
    }
  }

  setType(type) {
    // remove old type
    if (this.type) {
      this.element.classList.remove(this.type);
    }

    super.setType(type);

    // set new type
    if (type) {
      this.element.classList.add(type);
    }

    return this;
  }

  setName(name) {
    // remove old name
    if (this.element.firstChild.firstChild) {
      this.element.firstChild.removeChild(this.element.firstChild.firstChild);
    }

    super.setName(name);

    // set new name
    this.element.firstChild.appendChild(document.createTextNode(name));

    return this;
  }

  hide() {
    super.hide();
    this.element.style.display = 'none';
  }

  unhide() {
    super.unhide();
    this.element.style.display = '';
  }

  enableHook() {
    const el = this.element;

    // handle whenever someone inits a new connector on this action
    el.addEventListener('mousedown', (event) => {
      // we only take action from the first mousebutton
      if (event.button !== 0) {
        return;
      }

      // if there's nothing to move, return
      if (event.shiftKey && this.connectors.length === 0) {
        return;
      }

      event.stopPropagation();

      // only start a connector after we moved a little
      // this prevents picking up double click
      const initPageX = event.pageX;
      const initPageY = event.pageY;

      let mouseMoveListener;
      document.addEventListener('mousemove', mouseMoveListener = (event) => {
        // confirm that we moved
        const pageX = event.pageX;
        const pageY = event.pageY;
        if (Math.abs(pageX - initPageX) > 2 || Math.abs(pageY - initPageY) > 2) {
          document.removeEventListener('mousemove', mouseMoveListener);
          mouseMoveListener = null;

          // create a dummy action that acts as the input parent while moving
          this.node.editor.dummyXibleNode = new XibleEditorNode({
            name: 'dragdummy'
          });

          // hide the dummy
          this.node.editor.dummyXibleNode.element.style.visibility = 'hidden';
          this.node.editor.dummyXibleNode.element.style.zIndex = -1;

          let outGoing = this instanceof XibleEditorNodeOutput;
          outGoing = event.shiftKey ? !outGoing : outGoing;

          // create a dummyinput that acts as the connector endpoint
          if (outGoing) {
            this.node.editor.dummyIo = new XibleEditorNodeInput('dummy', {
              type: this.type
            });
            this.node.editor.dummyXibleNode.addInput(this.node.editor.dummyIo);
          } else {
            this.node.editor.dummyIo = new XibleEditorNodeOutput('dummy', {
              type: this.type
            });
            this.node.editor.dummyXibleNode.addOutput(this.node.editor.dummyIo);
          }

          // add the dummy to the editor
          this.node.editor.addNode(this.node.editor.dummyXibleNode);

          // get window offsets for viewport
          const actionsOffset = this.node.editor.getOffsetPosition();

          // set the initial position at the mouse position
          const left = ((event.pageX - actionsOffset.left - this.node.editor.left) / this.node.editor.zoom) -
            this.node.editor.dummyIo.element.offsetLeft - (outGoing ? 0 : this.node.editor.dummyIo.element.offsetWidth + 2);
          const top = ((event.pageY - actionsOffset.top - this.node.editor.top) / this.node.editor.zoom) -
            this.node.editor.dummyIo.element.offsetTop - (this.node.editor.dummyIo.element.offsetHeight / 2);

          this.node.editor.dummyXibleNode.setPosition(left, top);

          // append the connector
          if (event.shiftKey) {
            // find selected connectors
            const selectedConnectors = this.node.editor.selection
            .filter(sel => sel instanceof XibleEditorConnector && (sel.origin === this || sel.destination === this));
            this.node.editor.dummyXibleConnectors = selectedConnectors.length ?
              selectedConnectors : this.connectors.slice(0);

            if (outGoing) {
              this.node.editor.dummyXibleConnectors
              .forEach(conn => conn.setDestination(this.node.editor.dummyIo));
            } else {
              this.node.editor.dummyXibleConnectors
              .forEach(conn => conn.setOrigin(this.node.editor.dummyIo));
            }
          } else {
            this.node.editor.dummyXibleConnectors = [
              this.node.editor.addConnector(new XibleEditorConnector({
                origin: outGoing ? this : this.node.editor.dummyIo,
                destination: outGoing ? this.node.editor.dummyIo : this,
                type: this.type
              }))
            ];
          }

          // make the dummy action drag
          this.node.editor.deselect();
          this.node.editor.select(this.node.editor.dummyXibleNode);
          this.node.editor.initDrag(event);

          // keep track of these for snap ins
          this.node.editor.dummyXibleConnectors.originalOrigin =
            this.node.editor.dummyXibleConnectors[0].origin;
          this.node.editor.dummyXibleConnectors.originalDestination =
            this.node.editor.dummyXibleConnectors[0].destination;
        }
      });

      document.addEventListener('mouseup', () => {
        if (mouseMoveListener) {
          document.removeEventListener('mousemove', mouseMoveListener);
          mouseMoveListener = null;
        }
      }, {
        once: true
      });
    });

    // handle whenever someone drops a new connector on this nodeio
    el.addEventListener('mouseup', () => {
      const connectors = this.node.editor.dummyXibleConnectors;
      if (!connectors) {
        return;
      }

      const outGoing = this instanceof XibleEditorNodeOutput;
      const end = connectors[0][(outGoing ? 'origin' : 'destination')];
      if (
        end !== this.node.editor.dummyIo &&
        end !== this
      ) {
        return;
      }

      this.matchesConnectors(connectors)
      .then((matchesConnectors) => {
        if (!matchesConnectors) {
          return;
        }

        // create the new connectors
        connectors.forEach((conn) => {
          const newConn = new XibleEditorConnector({
            origin: outGoing ? this : conn.origin,
            destination: outGoing ? conn.destination : this
          });

          if (newConn.destination.global) {
            newConn.destination.setGlobal(undefined);
          }

          this.node.editor.loadedFlow.connectors.push(newConn);
          this.node.editor.addConnector(newConn);
        });

        // ensure we deselect
        this.node.editor.deselect();

        // destroy the temporary connector & dummyXibleNode
        this.node.editor.dummyXibleConnectors = null;
        this.node.editor.dummyIo = null;
        this.node.editor.dummyXibleNode.delete();
        this.node.editor.dummyXibleNode = null;
      });
    });

    // handle snap-to whenever a new connector is hovered over this io
    el.addEventListener('mouseover', () => {
      const connectors = this.node.editor.dummyXibleConnectors;
      if (!connectors) {
        return;
      }

      // we don't allow snap-in if the selected connectors are of multiple types,
      // while the input/output only allows a single type to be connected
      if (this.singleType) {
        const multiType = this instanceof XibleEditorNodeInput ?
          connectors
          .some(conn => conn.origin.type !== connectors[0].origin.type) :
          connectors
          .some(conn => conn.destination.type !== connectors[0].destination.type);
        if (multiType) {
          return;
        }
      }

      const outGoing = this instanceof XibleEditorNodeOutput;
      const end = connectors[0][(outGoing ? 'origin' : 'destination')];
      if (
        end !== this.node.editor.dummyIo &&
        end !== this
      ) {
        return;
      }

      this.matchesConnectors(connectors)
      .then((matchesConnectors) => {
        if (!matchesConnectors) {
          return;
        }

        if (this instanceof XibleEditorNodeInput) {
          connectors.forEach(conn => conn.setDestination(this));
        } else {
          connectors.forEach(conn => conn.setOrigin(this));
        }
      });
    });

    // handle snap-out
    el.addEventListener('mouseout', () => {
      const connectors = this.node.editor.dummyXibleConnectors;
      if (
        this instanceof XibleEditorNodeInput && connectors &&
        connectors[0].destination === this &&
        connectors[0].destination !== connectors.originalDestination
      ) {
        connectors.forEach(conn => conn.setDestination(this.node.editor.dummyIo));
      } else if (
        this instanceof XibleEditorNodeOutput && connectors &&
        connectors[0].origin === this &&
        connectors[0].origin !== connectors.originalOrigin
      ) {
        connectors.forEach(conn => conn.setOrigin(this.node.editor.dummyIo));
      }
    });
  }
};

class XibleEditorNodeInput extends XibleEditorNodeIo(xibleWrapper.NodeInput) {
}

class XibleEditorNodeOutput extends XibleEditorNodeIo(xibleWrapper.NodeOutput) {
  setGlobal(global) {
    super.setGlobal(global);

    if (this.node && this.node.flow) {
      this.node.flow.emit('global', this);
    }
  }
}

module.exports =  XibleEditorNode;

},{"./XibleEditorConnector.js":11,"./wrapperinstance.js":17}],14:[function(require,module,exports){
'use strict';

const XibleEditorNode = require('./XibleEditorNode.js');

class XibleEditorNodeSelector {
  /**
  * Create a new nodeSelector.
  * @param {XibleEditor} XIBLE_EDITOR
  */
  constructor(XIBLE_EDITOR) {
    this.xibleEditor = XIBLE_EDITOR;

    // indicates if the selector was opened above or below the mouse position
    // and left or right
    this.openTop = false;
    this.openLeft = false;

    // x & y position the selector was opened
    this.openYPosition = 0;
    this.openXPosition = 0;

    // the div containing the node list
    let div = this.div = document.body.appendChild(document.createElement('div'));
    div.setAttribute('id', 'nodeSelector');
    div.classList.add('hidden');

    // this list will be populated with the local installed nodes
    const nodesUl = this.nodesUl = document.createElement('ul');

    const filterInput = this.filterInput = div.appendChild(document.createElement('input'));
    filterInput.setAttribute('type', 'text');
    filterInput.setAttribute('placeholder', 'filter nodes');
    filterInput.addEventListener('input', (event) => {
      const filterInputValue = filterInput.value.toLowerCase();
      const searchWords = this.getSearchWords();

      let noResults = true;
      nodesUl.querySelectorAll('li').forEach((li) => {
        if (this.setListVisibility(li, filterInputValue, searchWords)) {
          noResults = false;
        }
      });

      if (noResults) {
        div.classList.add('noresults');
      } else {
        div.classList.remove('noresults');
      }

      this.position();
    });

    div.appendChild(nodesUl);

    // open the node menu on double click
    const openOnMouseEvent = (event) => {
      if (
        !event.ctrlKey && XIBLE_EDITOR.loadedFlow && XIBLE_EDITOR.browserSupport &&
        (event.target === XIBLE_EDITOR.element || event.target === XIBLE_EDITOR.element.firstChild)
      ) {
        this.open(event);
        event.preventDefault();
      }
    };
    this.xibleEditor.element.addEventListener('contextmenu', openOnMouseEvent);
    this.xibleEditor.element.addEventListener('dblclick', openOnMouseEvent);

    // hide the nodeSelector element if selection moves elsewhere
    let mouseDownEventHandler;
    document.body.addEventListener('mousedown', mouseDownEventHandler = (event) => {
      if (!div.classList.contains('hidden') && !div.contains(event.target)) {
        this.close();
      }
    });
	
	// clean out elements/handlers hooked to document.body
    // when this view gets removed
	function cleanUp(){
      if (div && div.parentNode) {
        document.body.removeChild(div);
        div = null;
      }

      document.body.removeEventListener('mousedown', mouseDownEventHandler);
	}

    this.fill();
  }

  getSearchWords() {
    return this.filterInput.value.toLowerCase().replace(/[\W_]+/g, ' ').split(' ');
  }

  /**
  * Changes the visibility on a node in the list, based on the search conditions.
  * @param {HTMLElement} li
  * @param {String} filterInputValue The search value.
  * @param {String[]} searchWords Search keywords.
  * @returns {Boolean} Visible or not.
  */
  setListVisibility(li, filterInputValue, searchWords) {
    const textContent = li.textContent.toLowerCase();

    li.classList.remove('headerMatchExact', 'headerMatchPartial');
    if (!filterInputValue || searchWords.every(searchWord => textContent.indexOf(searchWord) > -1)) {
      // specify more relevant search results
      const headerTextContent = li.firstChild.textContent.toLowerCase();
      if (headerTextContent === filterInputValue) {
        li.classList.add('headerMatchExact');
      } else if (searchWords.every(searchWord => headerTextContent.indexOf(searchWord) > -1)) {
        li.classList.add('headerMatchPartial');
      }

      li.classList.remove('hidden');
      return true;
    }

    li.classList.add('hidden');
    return false;
  }

  /**
  * Builds a node for the nodeSelector.
  * @param {String} nodeName
  * @param {xibleWrapper.Node} node
  * @returns {HTMLLIElement} The created HTML element, an LI.
  */
  buildNode(nodeName, node) {
    // list element containing the node heading and description
    const li = document.createElement('li');

    // the heading element containing the node name
    const h1 = li.appendChild(document.createElement('h1'));
    h1.appendChild(document.createTextNode(nodeName));
    h1.setAttribute('title', nodeName);

    // scroll text if it overflows
    li.addEventListener('mouseenter', (event) => {
      if (h1.scrollWidth > h1.offsetWidth) {
        h1.classList.add('overflow');
      }
    });

    li.addEventListener('mouseleave', (event) => {
      h1.classList.remove('overflow');
    });

    // description
    const description = node.description;
    if (description) {
      li.appendChild(document.createElement('p')).appendChild(document.createTextNode(description));
    }

    return li;
  }

  /**
  * Hooks relevant listeners to a node in the selector.
  */
  hookNode(li, node) {
    // onmousedown so the user can drag the newly inserted node immediately
    li.addEventListener('mousedown', (event) => {
      const actionsOffset = this.xibleEditor.getOffsetPosition();
      const editorNode = this.xibleEditor.addNode(new XibleEditorNode(node));
      this.xibleEditor.loadedFlow.addNode(editorNode);
      editorNode.setPosition(((event.pageX - actionsOffset.left - this.xibleEditor.left) / this.xibleEditor.zoom) - (editorNode.element.firstChild.offsetWidth / 2), ((event.pageY - actionsOffset.top - this.xibleEditor.top) / this.xibleEditor.zoom) - (editorNode.element.firstChild.offsetHeight / 2));
      this.xibleEditor.deselect();
      this.xibleEditor.select(editorNode);
      this.xibleEditor.initDrag(event);

      this.close();
    });
  }

  /**
  * Fetches the nodes from xible and places them in the nodeSelector ul.
  * Keeps visible state correct if this functions is called multiple times.
  * @returns {Promise.<undefined>} Resolves when complete.
  */
  fill() {
    // track all nodeNames currently visible
    let visibleNodeNames;
    if (Array.from(this.nodesUl.querySelectorAll('li.hidden')).length) {
      visibleNodeNames = Array.from(this.nodesUl
      .querySelectorAll('li:not(.hidden) h1'))
      .map(header => header.getAttribute('title'));
    }

    this.nodesUl.innerHTML = '';

    // get the installed nodes
    return this.xibleEditor.xibleWrapper.Node.getAll().then((nodes) => {
      Object.keys(nodes).forEach((nodeName) => {
        const li = this.buildNode(nodeName, nodes[nodeName]);
        this.hookNode(li, nodes[nodeName]);

        if (visibleNodeNames) {
          li.classList.add('hidden');
        }

        this.nodesUl.appendChild(li);
      });

      // make items visible that were so before
      if (visibleNodeNames) {
        for (let i = 0; i < visibleNodeNames.length; i += 1) {
          const h1 = this.nodesUl.querySelector(`li h1[title="${visibleNodeNames[i]}"]`);
          if (h1) {
            h1.parentNode.classList.remove('hidden');
          }
        }
      }
    });
  }

  /**
  * Positions the nodeSelector according to some vars indicating where to open.
  */
  position() {
    const clientRect = this.div.getBoundingClientRect();
    if (this.openTop) {
      this.div.style.top = `${this.openYPosition - clientRect.height}px`;
    } else {
      this.div.style.top = `${this.openYPosition}px`;
    }

    if (this.openLeft) {
      this.div.style.left = `${this.openXPosition - clientRect.width}px`;
    } else {
      this.div.style.left = `${this.openXPosition}px`;
    }
  }

  /**
  * Opens the main node selector (not the detail one).
  * @param {MouseEvent} event Event which triggered the open. Used to set the correct position.
  */
  open(event) {
    // unhide all nodes,
    // so the correct height is checked against the window height and mouse pos
    // they will be hidden again later on
    Array.from(this.nodesUl.querySelectorAll('li.hidden')).forEach((li) => {
      li.classList.remove('hidden');
    });

    // track the positions where the selector was originally opened
    this.openXPosition = event.pageX;
    this.openYPosition = event.pageY;

    // unhide and position the nodeselector for the first overflow check
    this.div.classList.remove('hidden');
    this.div.style.left = `${this.openXPosition}px`;
    this.div.style.top = `${this.openYPosition}px`;

    // ensure we are not overflowing the chrome
    // this needs to be checked with a non-filtered list
    // otherwise changing the filter might still overflow y
    const clientRect = this.div.getBoundingClientRect();
    this.openTop = this.openLeft = false;
    if (clientRect.top + clientRect.height > window.innerHeight) {
      this.openTop = true;
    }
    if (clientRect.left + clientRect.width > window.innerWidth) {
      this.openLeft = true;
    }

    // focus!
    if (this.filterInput.value) {
      this.filterInput.select();
    }
    this.filterInput.focus();

    // filter the results
    if (this.filterInput.value) {
      Array.from(this.nodesUl.querySelectorAll('li')).forEach((li) => {
        if (this.filterInput.value && li.textContent.indexOf(this.filterInput.value) === -1) {
          li.classList.add('hidden');
        }
      });
    }

    // reposition
    if (this.openTop || this.openLeft) {
      this.position();
    }
  }

  /**
  * Closes all the node selectors,
  * both the main node list and the detail/download view.
  */
  close() {
    this.div.classList.add('hidden');
  }
}

module.exports = XibleEditorNodeSelector;

},{"./XibleEditorNode.js":13}],15:[function(require,module,exports){
const xibleWrapper = require('./wrapperinstance.js');

module.exports = {
    xibleWrapper: xibleWrapper,
    XibleEditor: require('./xibleEditor.js'),
    XibleEditorConnector: require('./xibleEditorConnector.js'),
    XibleEditorFlow: require('./xibleEditorFlow.js'),
    XibleEditorNode: require('./xibleEditorNode.js'),
    XibleEditorNodeSelector: require('./xibleEditorNodeSelector.js')
};
},{"./wrapperinstance.js":17,"./xibleEditor.js":18,"./xibleEditorConnector.js":19,"./xibleEditorFlow.js":20,"./xibleEditorNode.js":21,"./xibleEditorNodeSelector.js":22}],16:[function(require,module,exports){
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

},{"./Connector.js":4,"./Flow.js":5,"./Input.js":6,"./Io.js":7,"./Node.js":8,"./Output.js":9,"./TypeDef.js":10,"events":2,"oohttp":3}],17:[function(require,module,exports){
var XibleWrapper = require('./wrapper.js');

var xibleWrapper = new XibleWrapper();
xibleWrapper.on('error', (err) => {
    console.log(err);
});

module.exports = xibleWrapper;

},{"./wrapper.js":16}],18:[function(require,module,exports){
'use strict';

const EventEmitter = require('events').EventEmitter;

const XibleEditorFlow = require('./XibleEditorFlow.js');
const XibleEditorNodeSelector = require('./XibleEditorNodeSelector.js');
const XibleEditorNode = require('./XibleEditorNode.js');

class XibleEditor extends EventEmitter {
  constructor(xibleWrapper) {
    super();

    this.xibleWrapper = xibleWrapper;

    // remove all editor statuses when connection closes
    xibleWrapper.on('close', () => {
      if (!this.loadedFlow) {
        return;
      }
      this.loadedFlow.removeAllStatuses();
    });

    xibleWrapper.on('message', (message) => {
      this.messageHandler(message);
    });

    // stage element
    this.element = document.createElement('div');
    this.element.classList.add('xible');
    this.element.appendChild(document.createElement('div'));
    this.element.firstChild.classList.add('editor');
    this.element.firstChild.style.transformOrigin = '0 0';

    // check for browser support
    this.browserSupportItems = {
      attachShadow: typeof this.element.attachShadow === 'function'
    };
    this.browserSupport = true;
    for (const item in this.browserSupportItems) {
      if (!this.browserSupportItems[item]) {
        this.browserSupport = false;
        break;
      }
    }

    this.selection = [];
    this.copySelection = null;

    this.nodeDragHasFired = false;
    this.nodeDragListener = null;
    this.nodeDragSpliceConnector = false;

    this.areaMoveListener = null;

    this.dummyXibleConnectors = null;
    this.dummyXibleNode = null;
    this.dummyIo = null;

    this.flows = {};
    this.loadedFlow = null;

    this.enableNodeSelector();
    this.enableZoom();
    this.enablePan();
    this.enableHook();
    this.enableSelection();
  }

  describeNode(node) {
    if (!(node instanceof XibleEditorNode)) {
      throw new Error('1st argument must be a XibleEditorNode');
    }

    node = node.duplicate(true);

    node.emit('beforeAppend');

    const describeEl = this.element.appendChild(document.createElement('div'));
    describeEl.classList.add('describe');

    // close button
    const closeButton = describeEl.appendChild(document.createElement('button'));
    closeButton.setAttribute('type', 'button');
    closeButton.appendChild(document.createTextNode('X'));
    closeButton.onclick = () => {
      this.element.removeChild(describeEl);
    };

    // ignore default xible container event handlers
    describeEl.addEventListener('wheel', (event) => {
      event.stopPropagation();
    });

    describeEl.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });

    describeEl.addEventListener('mouseup', (event) => {
      event.stopPropagation();
    });

    describeEl.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    // append the node descriptionEl
    const descriptionEl = describeEl.appendChild(document.createElement('p'));
    descriptionEl.appendChild(document.createTextNode(node.description || 'not described'));

    if (!node.description) {
      descriptionEl.classList.add('none');
    }

    // append the node
    node.setPosition(0, 0);
    node.element.style.transform = '';

    // append the node type information
    /*
    let typeEl = node.element.querySelector('h1').appendChild(document.createElement('p'));
    typeEl.appendChild(document.createElement('span')).appendChild(document.createTextNode(node.type));

    if(node.type === 'action') {
      typeEl.appendChild(document.createTextNode('Double-click this header in the flow overview to start it in directed mode.'));
    }
    */

    // we need to append early because the offsetHeight/scrollHeight of
    // the description els are required to check for overflow
    describeEl.appendChild(node.element);

    // add the description for each io
    node.getInputs().concat(node.getOutputs()).forEach((io) => {
      // get rid of event listeners
      const clonedNode = io.element.cloneNode(true);
      io.element.parentNode.replaceChild(clonedNode, io.element);
      io.element = clonedNode;

      // add description
      const descriptionEl = io.element.appendChild(document.createElement('p'));
      descriptionEl.appendChild(document.createElement('span')).appendChild(document.createTextNode(io.type || 'any'));
      descriptionEl.appendChild(document.createTextNode(io.description || 'not described'));

      if (!io.description) {
        descriptionEl.classList.add('none');
      }

      if (descriptionEl.scrollHeight > descriptionEl.offsetHeight) {
        descriptionEl.classList.add('overflow');
      }
    });

    // handle descriptions for input elements and labels
    node.on('editorContentLoad', () => {
      if (!node.editorContentEl) {
        return;
      }

      node.element.onmouseenter = () => {
        node.getRootLabelElements().forEach((label) => {
          label.classList.add('nodeHover');
        });
      };

      node.element.onmouseleave = () => {
        node.getRootLabelElements().forEach((label) => {
          label.classList.remove('nodeHover');
        });
      };

      // add the description for each input element
      node.getRootLabelElements()
      .forEach((label) => {
        const description = label.getAttribute('data-description');

        // this is actually not allowed
        // a label may not contain a block element
        const descriptionEl = label.appendChild(document.createElement('p'));
        descriptionEl.appendChild(document.createTextNode(description || 'not described'));

        if (!description) {
          descriptionEl.classList.add('none');
        }

        if (descriptionEl.scrollHeight > descriptionEl.offsetHeight) {
          descriptionEl.classList.add('overflow');
        }
      });
    });

    node.editor = this;
    node.emit('append');
  }

  enableNodeSelector() {
    this.nodeSelector = new XibleEditorNodeSelector(this);
  }

  /**
  * Gets the flows from the Xible API
  */
  getFlows(flows) {
      for (const flowId in flows) {
        const flow = new XibleEditorFlow(flows[flowId]);
        this.flows[flowId] = flow;
      }

      return this.flows;
  }

  /**
  * Handles a message from xibleWrapper
  * @param {Object} json The message Object
  */
  messageHandler(json) {
    // get the node for this message
    let node;
    if (json.nodeId && this.loadedFlow) {
      node = this.loadedFlow.getNodeById(json.nodeId);
      if (!node) {
        return;
      }
    }

    if (json.flowId && !this.flows[json.flowId]) {
      return;
    }
    switch (json.method) {
      case 'xible.removeAllStatuses':

        this.loadedFlow.removeAllStatuses();
        break;

      case 'xible.node.addStatus':
        if (node) {
          node.addStatus(json.status);
        }

        break;

      case 'xible.node.updateStatusById':
        if (node) {
          node.updateStatusById(json.status._id, json.status);
        }

        break;

      case 'xible.node.addProgressBar':
        if (node) {
          node.addProgressBar(json.status);
        }

        break;

      case 'xible.node.updateProgressBarById':
        if (node) {
          node.updateProgressBarById(json.status._id, json.status);
        }

        break;

      case 'xible.node.removeStatusById':
        if (node) {
          node.removeStatusById(json.status._id, json.status.timeout);
        }

        break;

      case 'xible.node.removeAllStatuses':
        if (node) {
          node.removeAllStatuses();
        }

        break;

      case 'xible.node.setTracker':
        if (node) {
          node.setTracker(json.status);
        }

        break;

      case 'xible.flow.usage':
        this.emit('flow.usage', json.flows);

        // emit for every flow
        for (let i = 0; i < json.flows.length; i += 1) {
          const flow = this.flows[json.flows[i]._id];
          if (flow) {
            flow.emit('usage', json.flows[i]);
          }
        }

        break;
    }
  }

  /**
  * Returns a Flow by the given id, or undefined if not found
  * @param {Number}
  * @return {XibleEditorFlow|Void} The found Flow
  */
  getFlowById(id) {
    return this.flows.find(flow => flow._id === id);
  }

  /**
  * Appends the given Node to the Editor
  * @param {XibleEditorNode} node The Node to add
  * @return {XibleEditorNode} The given Node
  */
  addNode(node) {
    node.emit('beforeAppend');

    this.element.firstChild.appendChild(node.element);
    node.editor = this;

    // global inputs
    // FIXME: move this to the XibleFlow def and track all global outputs there
    let globalTypes = [].concat(...this.loadedFlow.nodes.map(node => node.getGlobalOutputs()
    .map(output => output.type)));

    node.getInputs().forEach((input) => {
      let globalValue = input.global;
      if (
        globalTypes.indexOf(input.type) > -1 &&
        !input.connectors.length && input.global !== false
      ) {
        globalValue = true;
      }
      input.setGlobal(globalValue);
    });

    // global outputs
    node.getGlobalOutputs().forEach((output) => {
      this.loadedFlow.setGlobalFromOutput(output);
    });

    globalTypes = null;

    node.emit('append');

    return node;
  }

  /**
  * Append a Connector to the Editor
  * @param {XibleEditorConnector} connector The Connector to add
  * @return {XibleEditorConnector} The given connector
  */
  addConnector(connector) {
    connector.editor = this;
    this.element.firstChild.appendChild(connector.element);
    connector.draw();

    return connector;
  }

  /**
  * Remove a Node or Connector from the Editor
  * @param {(XibleEditorNode|XibleEditorConnector)} obj The object to remove
  */
  deleteChild(obj) {
    if (obj instanceof XibleEditorNode) {
      this.deleteNode(obj);
    } else if (obj instanceof XibleEditorConnector) {
      this.deleteConnector(obj);
    }
  }

  /**
  * Remove a Node from the Editor
  * @param {XibleEditorNode} node The Node to remove
  */
  deleteNode(node) {
    let index;
    if ((index = this.loadedFlow.nodes.indexOf(node)) > -1) {
      this.loadedFlow.nodes.splice(index, 1);
    }

    this.deselect(node);

    // check for globals
    const globalOutputs = node.getGlobalOutputs();
    for (let i = 0; i < globalOutputs.length; i += 1) {
      globalOutputs[i].setGlobal(false);
    }

    node.editor = null;

    // remove from dom
    if (node.element.parentNode) {
      this.element.firstChild.removeChild(node.element);
    }
  }

  /**
  * Remove a Connector from the Editor
  * @param {XibleEditorConnector} connector The Connector to remove
  */
  deleteConnector(connector) {
    let index;
    if ((index = this.loadedFlow.connectors.indexOf(connector)) > -1) {
      this.loadedFlow.connectors.splice(index, 1);
    }

    this.deselect(connector);

    connector.editor = null;

    // remove from dom
    if (connector.element.parentNode) {
      this.element.firstChild.removeChild(connector.element);
    }
  }

  /**
  * Opens the given flow in the editor.
  * Does nothing if that flow is already loaded.
  * @param {XibleEditorFlow} flow The flow to open/view/edit.
  * @returns {Boolean} False if this flow is already loaded, true otherwise.
  */
  viewFlow(flow) {
    // if (!(flow instanceof XibleEditorFlow)) {
    //   throw new Error('not a flow');
    // }

    // don't reload an already loaded flow
    if (this.loadedFlow && this.loadedFlow._id === flow._id) {
      return false;
    }

    // unload already loaded flow
    if (this.loadedFlow) {
      this.loadedFlow.removeAllStatuses();
      this.loadedFlow.editor = null;
    }

    // clean
    this.element.firstChild.innerHTML = '';

    flow.editor = this;
    this.loadedFlow = flow;
    this.element.setAttribute('data-flow', flow._id);

    // setup the nodes
    flow.nodes.forEach((node) => {
      this.addNode(node);
    });

    // setup the connectors
    flow.connectors.forEach((connector) => {
      this.addConnector(connector);
    });

    // setup the viewstate
    this.left = flow.viewState.left;
    this.top = flow.viewState.top;
    this.zoom = flow.viewState.zoom;
    this.backgroundLeft = flow.viewState.backgroundLeft;
    this.backgroundTop = flow.viewState.backgroundTop;
    this.transform();

    this.emit('viewflow');
    return true;
  }

  /**
  * Returns the non-transformed offset position.
  */
  getOffsetPosition() {
    let el = this.element.firstChild;
    let actionsOffsetTop = 0;
    let actionsOffsetLeft = 0;

    do {
      actionsOffsetTop += el.offsetTop;
      actionsOffsetLeft += el.offsetLeft;
    } while ((el = el.offsetParent));

    return {
      left: actionsOffsetLeft,
      top: actionsOffsetTop
    };
  }

  /**
  * Transforms the element according to the object properties.
  */
  transform() {
    this.element.firstChild.style.transform = `translate(${this.left}px, ${this.top}px) scale(${this.zoom})`;
    this.element.style.backgroundPosition = `${this.backgroundLeft}px ${this.backgroundTop}px`;
  }

  /**
  * Deselect everything if no arguments provided, or remove just the first argument.
  * @param {(XibleEditorNode|XibleEditorConnector)} [obj]
  * The Node or Connector to remove from the selection.
  */
  deselect(obj) {
    if (obj) {
      const selectionIndex = this.selection.indexOf(obj);
      if (selectionIndex > -1) {
        this.selection.splice(selectionIndex, 1);
        obj.element.classList.remove('selected');
      }

      return;
    }

    for (let i = 0; i < this.selection.length; i += 1) {
      this.selection[i].element.classList.remove('selected');
    }

    this.selection = [];
  }

  /**
  * Decides what to do with the selection, based on an event.
  * Example: adds node to the selection when ctrl is pressed and a node is clicked.
  * @param {Event} event The event taking place.
  * @param {(XibleEditorNode|XibleEditorConnector)} [obj] New Node or Connector.
  */
  toggleSelectionOnMouseEvent(event, obj) {
    if (event.button === 1) {
      return;
    }

    const selectionIndex = this.selection.indexOf(obj);

    if (!event.ctrlKey && event.type === 'mousedown' && selectionIndex === -1) {
      this.deselect();
      this.selection.push(obj);
      obj.element.classList.add('selected');
    } else if (event.ctrlKey && event.type === 'mouseup' && selectionIndex === -1 && !this.nodeDragHasFired) {
      this.selection.push(obj);
      obj.element.classList.add('selected');
    } else if (!event.ctrlKey && event.type === 'mouseup' && selectionIndex > -1 && !this.nodeDragHasFired) {
      this.deselect();
      this.selection.push(obj);
      obj.element.classList.add('selected');
    } else if (event.ctrlKey && event.type === 'mouseup' && selectionIndex > -1 && !this.nodeDragHasFired) {
      this.deselect(obj);
    }
  }

  /**
  * Adds a Node or Connector to the selection.
  * @param {(XibleEditorNode|XibleEditorConnector)} obj The Node or Connector to add.
  */
  select(obj) {
    const selectionIndex = this.selection.indexOf(obj);

    if (selectionIndex === -1) {
      this.selection.push(obj);
      obj.element.classList.add('selected');
    }
  }

  /**
  * Inits a drag of the selection (after mousedown).
  * @param {Event} event The (mouse)event for the drag.
  */
  initDrag(event) {
    // exit if we're already dragging
    if (this.nodeDragListener || !this.selection.length) {
      return;
    }

    // init the start positions of the drag
    let initPageX = event.pageX;
    let initPageY = event.pageY;
    this.nodeDragHasFired = false;

    // get all the connectors for the selected node
    // so we can check if we are not splicing a connector for the selected node
    // because that wouldn't make sense
    const selNodeConnectors = [];
    let selNode;
    if (this.selection.length === 1 && this.selection[0] instanceof XibleEditorNode) {
      selNode = this.selection[0];

      selNode.getInputs().concat(selNode.getOutputs()).forEach((io) => {
        selNodeConnectors.push(...io.connectors);
      });
    }

    // catch the mousemove event
    document.body.addEventListener('mousemove', this.nodeDragListener = (event) => {
      // check if mouse actually moved
      // see crbug.com/327114
      if (initPageX === event.pageX && initPageY === event.pageY) {
        return;
      }

      this.nodeDragHasFired = true;

      // check how much we moved since the initial mousedown event
      const relativePageX = (event.pageX - initPageX) / this.zoom;
      const relativePageY = (event.pageY - initPageY) / this.zoom;

      // save the values for the next trigger of this function
      initPageX = event.pageX;
      initPageY = event.pageY;

      // update position of each of the selection items that cares
      for (let i = 0; i < this.selection.length; i += 1) {
        const sel = this.selection[i];
        if (typeof (sel.setPosition) === 'function') {
          sel.setPosition(sel.left + relativePageX, sel.top + relativePageY);
        }
      }

      // check if the selection is hovering a connector that it could be part of
      if (this.selection.length === 1 && this.selection[0] instanceof XibleEditorNode) {
        const selBounding = selNode.element.getBoundingClientRect();
        const selLeftAvg = selNode.left + (selBounding.width / this.zoom) / 2;
        const selTopAvg = selNode.top + (selBounding.height / this.zoom) / 2;

        const previousSpliceConnector = this.nodeDragSpliceConnector;

        const hasSpliceConnector = this.loadedFlow.connectors.some((connector) => {
          // ignore hovering over connectors that are connected to the selected node
          if (selNodeConnectors.indexOf(connector) > -1) {
            return false;
          }

          if (
            (
              selNode.getInputsByType(connector.origin.type).length ||
              (connector.origin.type !== 'trigger' && selNode.getInputsByType(null).length)
            ) &&
            (
              selNode.getOutputsByType(connector.origin.type).length ||
              (connector.destination.type !== 'trigger' && selNode.getOutputsByType(null).length) ||
              (
                selNode.outputs.length &&
                !connector.destination.type &&
                selNode.outputs.length > selNode.getOutputsByType('trigger').length
              )
            )
          ) {
            const connBounding = connector.element.getBoundingClientRect();
            if (
              Math.abs((connector.left + (connBounding.width / this.zoom) / 2) - selLeftAvg) < 20 &&
              Math.abs((connector.top + (connBounding.height / this.zoom) / 2) - selTopAvg) < 20
            ) {
              this.nodeDragSpliceConnector = connector;
              connector.element.classList.add('splice');
              selNode.element.classList.add('splice');
              return true;
            }
          }
          return false;
        });

        if (!hasSpliceConnector) {
          this.nodeDragSpliceConnector = null;
          selNode.element.classList.remove('splice');
        }

        if (
          previousSpliceConnector &&
          (!hasSpliceConnector || previousSpliceConnector !== this.nodeDragSpliceConnector)
        ) {
          previousSpliceConnector.element.classList.remove('splice');
        }
      }

      event.preventDefault();
    });
  }

  /**
  * Starts an area selector based on a mouse event.
  * @param  {Event} event The (mouse)event which triggered the area selector.
  */
  initAreaSelector(event) {
    // exit if we're already dragging
    if (this.areaMoveListener) {
      return;
    }

    // init the start positions of the drag
    const initPageX = event.pageX;
    const initPageY = event.pageY;

    // get the xible position
    const xibleBounding = this.element.getBoundingClientRect();
    const areaElLeft = initPageX - xibleBounding.left;
    const areaElTop = initPageY - xibleBounding.top;

    // create the area element
    let areaEl;

    // catch the mousemove event
    document.body.addEventListener('mousemove', this.areaMoveListener = (event) => {
      if (!this.loadedFlow) {
        return;
      }

      // check how much we moved since the initial mousedown event
      let relativePageX = event.pageX - initPageX;
      let relativePageY = event.pageY - initPageY;

      if (Math.abs(relativePageY) < 3 && Math.abs(relativePageX) < 3) {
        return;
      } else if (!areaEl) {
        areaEl = document.createElement('div');
        areaEl.classList.add('area');
        areaEl.style.transform = `translate(${areaElLeft}px, ${areaElTop}px)`;
        this.element.appendChild(areaEl);
      }

      // the left and top position of the area element compared to the document/page
      let areaElPageLeft = initPageX;
      let areaElPageTop = initPageY;

      // allow for negative selections
      if (relativePageX < 0 || relativePageY < 0) {
        let absAreaElLeft = areaElLeft;
        let absAreaElTop = areaElTop;

        if (relativePageX < 0) {
          absAreaElLeft += relativePageX;
          areaElPageLeft += relativePageX;
        }

        if (relativePageY < 0) {
          absAreaElTop += relativePageY;
          areaElPageTop += relativePageY;
        }

        areaEl.style.transform = `translate(${absAreaElLeft}px, ${absAreaElTop}px)`;

        relativePageX = Math.abs(relativePageX);
        relativePageY = Math.abs(relativePageY);
      }

      // adjust the size of the selection area
      areaEl.style.width = `${relativePageX}px`;
      areaEl.style.height = `${relativePageY}px`;

      // deselect all previously selected nodes
      this.deselect();

      // check what nodes fall within the selection
      for (let i = 0; i < this.loadedFlow.nodes.length; i += 1) {
        const node = this.loadedFlow.nodes[i];
        const nodeBounding = node.element.getBoundingClientRect();
        const nodeLeftAvg = nodeBounding.left + nodeBounding.width / 2;
        const nodeTopAvg = nodeBounding.top + nodeBounding.height / 2;

        if (
          nodeLeftAvg > areaElPageLeft && nodeLeftAvg < areaElPageLeft + relativePageX &&
          nodeTopAvg > areaElPageTop && nodeTopAvg < areaElPageTop + relativePageY
        ) {
          this.select(node);
        }
      }

      event.preventDefault();
    });
  }

  /**
  * This methods enables the ability of selecting items in the editor.
  */
  enableSelection() {
    // mousedown
    document.body.addEventListener('mousedown', (event) => {
      if (!this.loadedFlow) {
        return;
      }

      // drag handler
      if (event.button === 0) {
        // area selector
        if (
          !this.selection.length &&
          (event.target === this.element || event.target === this.element.firstChild)
        ) {
          this.initAreaSelector(event);
        } else if (!XibleEditor.isInputElement(event.target)) { // drag handler
          this.initDrag(event);
        }
      }
    });

    // mouseup
    document.body.addEventListener('mouseup', (event) => {
      if (!this.loadedFlow) {
        return;
      }

      // if a drag never started or the mouse position never changed
      if (!this.nodeDragListener || !this.nodeDragHasFired) {
        // deselect
        if (
          (event.target === this.element.firstChild || event.target === this.element) &&
          !event.ctrlKey && event.button === 0
        ) {
          this.deselect();
        }
      }

      // complete the selection after an area select
      if (this.areaMoveListener) {
        document.body.removeEventListener('mousemove', this.areaMoveListener);
        this.areaMoveListener = null;

        const areaEl = document.querySelector('.xible .area');
        if (areaEl) {
          areaEl.parentNode.removeChild(areaEl);
        }
      }

      if (!this.nodeDragListener) {
        return;
      }

      document.body.removeEventListener('mousemove', this.nodeDragListener);
      this.nodeDragListener = null;

      // splice a connector
      if (this.nodeDragSpliceConnector) {
        const selNode = this.selection[0];
        const origConnectorDestination = this.nodeDragSpliceConnector.destination;

        selNode.element.classList.remove('splice');
        this.nodeDragSpliceConnector.element.classList.remove('splice');

        // connect the connector to the first input of type of the selected node
        let selInputs = selNode.getInputsByType(this.nodeDragSpliceConnector.origin.type);
        if (!selInputs.length) {
          selInputs = selNode.getInputsByType(null);
        }
        const selInput = selInputs[0];
        this.nodeDragSpliceConnector.setDestination(selInput);

        // connect a duplicate of the connector to the first output of type of the selected node
        const dupConn = new XibleEditorConnector();
        this.loadedFlow.connectors.push(dupConn);

        let selOutputs = selNode.getOutputsByType(this.nodeDragSpliceConnector.origin.type);
        let selOutput;
        if (!selOutputs.length) {
          selOutputs = selNode.getOutputsByType(null);
          if (selOutputs.length) {
            selOutput = selOutputs[0];
          } else {
            selOutput = selNode.outputs.find(output => output.type !== 'trigger');
          }
        } else {
          selOutput = selOutputs[0];
        }

        dupConn.setOrigin(selOutput);
        dupConn.setDestination(origConnectorDestination);

        this.addConnector(dupConn);

        this.nodeDragSpliceConnector = null;
      }
    });

    // key handlers
    document.body.addEventListener('keydown', (event) => {
      if (!this.loadedFlow || XibleEditor.isInputElement(event.target)) {
        return;
      }

      switch (event.key) {
        // remove selection on delete or backspace
        case 'Delete':
        case 'Backspace':
          while (this.selection.length) {
            this.selection[0].delete();
          }
          event.preventDefault();

          break;

          // select all
        case 'a':
          if (event.ctrlKey) {
            this.loadedFlow.nodes.forEach(node => this.select(node));
            this.loadedFlow.connectors.forEach(connector => this.select(connector));

            event.preventDefault();
          }

          break;

          // deselect all
        case 'd':
          if (event.ctrlKey) {
            this.deselect();
            event.preventDefault();
          }

          break;

          // deselect all
        case 'Escape':
          this.deselect();
          event.preventDefault();

          break;

          // duplicate layers
        case 'j':
          if (event.ctrlKey) {
            this.duplicateToEditor(this.selection);
            event.preventDefault();
          }

          break;

          // cut
        case 'x':
          if (event.ctrlKey && this.selection.length) {
            this.copySelection = this.duplicate(this.selection);
            while (this.selection.length) {
              this.selection[0].delete();
            }

            event.preventDefault();
          }

          break;

          // copy
        case 'c':
          if (event.ctrlKey && this.selection.length) {
            this.copySelection = this.duplicate(this.selection);
          }

          event.preventDefault();

          break;

          // paste
        case 'v':
          if (event.ctrlKey && this.copySelection) {
            // TODO: ensure paste is in view
            this.duplicateToEditor(this.copySelection);

            event.preventDefault();
          }

          break;

          // help
        case 'h':
        case '?':
          if (this.selection.length === 1 && this.selection[0] instanceof XibleEditorNode) {
            this.describeNode(this.selection[0]);
            event.preventDefault();
          }

          break;

          // save
        case 's':
          if (event.ctrlKey) {
            this.loadedFlow.save();
            event.preventDefault();
          }

          break;
      }
    });
  }

  /**
  * Duplicates the given selection in the editor.
  * Repositions the duplicated selection by x+20px, y+20px.
  * @param {(XibleEditorNode|XibleEditorConnector)[]} [selection=] the selection to duplicate.
  */
  duplicateToEditor(selection = this.selection) {
    const duplicates = this.duplicate(selection);

    // add the nodes
    duplicates.forEach((dup) => {
      if (!(dup instanceof XibleEditorNode)) {
        return;
      }

      // TODO: check if there's already an element at this position (within 20px radius)
      // reposition if true
      dup.setPosition(dup.left + 20, dup.top + 20);

      this.loadedFlow.addNode(dup);
      this.addNode(dup);
    });

    // add the connectors
    duplicates.forEach((dup) => {
      if (!(dup instanceof XibleEditorConnector)) {
        return;
      }

      if (
        this.loadedFlow.nodes.indexOf(dup.origin.node) === -1 ||
    this.loadedFlow.nodes.indexOf(dup.destination.node) === -1
      ) {
        return;
      }

      this.loadedFlow.addConnector(dup);
      this.addConnector(dup);
    });

    // select the duplicates
    this.deselect();
    duplicates.forEach(dup => this.select(dup));
  }

  /**
  * Duplicates the given selection and returns that duplication as an array.
  * @param {(XibleEditorNode|XibleEditorConnector)[]} [selection=] Selection to duplicate.
  */
  duplicate(selection = this.selection) {
    const newSelection = [];
    const dupMap = {};

    selection.forEach((sel) => {
      if (!(sel instanceof XibleEditorNode)) {
        return;
      }

      const dup = sel.duplicate();
      dupMap[sel._id] = dup;
      newSelection.push(dup);
    });

    // make a copy of all connectors between selected nodes
    let processedOutputs = [];
    const processedConnectors = [];
    selection.forEach((sel) => {
      if (!(sel instanceof XibleEditorNode)) {
        return;
      }

      sel.getOutputs().forEach((output) => {
        if (processedOutputs.indexOf(output._id) > -1) {
          return;
        }
        processedOutputs.push(output._id);

        output.connectors.forEach((conn) => {
          if (dupMap[conn.destination.node._id]) {
            processedConnectors.push(`${conn.origin._id},${conn.destination._id}`);

            const dupConn = new XibleEditorConnector({
              origin: dupMap[sel._id].getOutputByName(output.name),
              destination: dupMap[conn.destination.node._id].getInputByName(conn.destination.name)
            });
            newSelection.push(dupConn);
          }
        });
      });
    });
    processedOutputs = null;

    // make a copy of all connectors with only one side connected in the selection
    selection.forEach((conn) => {
      if (!(conn instanceof XibleEditorConnector)) {
        return;
      }

      if (processedConnectors.indexOf(`${conn.origin._id},${conn.destination._id}`) > -1) {
        return;
      }

      const origNode = dupMap[conn.origin.node._id];
      const destNode = dupMap[conn.destination.node._id];
      if (!origNode || !destNode) {
        const dupConn = new XibleEditorConnector({
          origin: origNode ? origNode.getOutputByName(conn.origin.name) : conn.origin,
          destination: destNode ? destNode.getInputByName(conn.destination.name) : conn.destination
        });
        newSelection.push(dupConn);
      }
    });

    return newSelection;
  }

  /**
  * Enables zooming using the scrollwheel in the editor.
  */
  enableZoom() {
    this.zoom = 1;

    // trigger zoom from scrollwheel
    this.element.addEventListener('wheel', (event) => {
      // prevent default browser action; scroll
      event.preventDefault();

      // find the current cursor position,
      // relative against the actions, but no transform (translate/zoom) applied
      const mouseLeft = event.pageX - this.getOffsetPosition().left;
      const mouseTop = event.pageY - this.getOffsetPosition().top;

      // find the current cursor position,
      // relative against the actions, but now with transform (translate/zoom) applied
      const relativeMouseLeft = (mouseLeft - this.left) / this.zoom;
      const relativeMouseTop = (mouseTop - this.top) / this.zoom;

      // in or out
      if (event.deltaY > 0 && this.zoom >= 0.2) {
        this.zoom = (Math.round(this.zoom * 10) - 1) / 10;
      } else if (event.deltaY < 0 && this.zoom < 5) {
        this.zoom = (Math.round(this.zoom * 10) + 1) / 10;
      }

      // update left/top based on cursor position
      this.left = relativeMouseLeft - (this.zoom * relativeMouseLeft) + mouseLeft - relativeMouseLeft;
      this.top = relativeMouseTop - (this.zoom * relativeMouseTop) + mouseTop - relativeMouseTop;

      // apply the zoom transformation
      this.transform();
    });
  }

  /**
  * Enables panning by holding down the scrollwheel.
  */
  enablePan() {
    this.top = 0;
    this.left = 0;
    this.backgroundLeft = 0;
    this.backgroundTop = 0;

    let mousePanFunction;
    this.element.addEventListener('mousedown', (event) => {
      // if we are already panning, don't do anything
      if (mousePanFunction) {
        return;
      }

      // we pan on scrollwheel
      if (event.button === 1) {
        // initial values based on current position
        const initPageX = event.pageX;
        const initPageY = event.pageY;
        const initLeft = this.left;
        const initTop = this.top;
        const initBackgroundLeft = this.backgroundLeft;
        const initBackgroundTop = this.backgroundTop;

        this.element.classList.add('panning');

        // catch the mousemove event
        document.body.addEventListener('mousemove', mousePanFunction = (event) => {
          // check how much we moved since the initial mousedown event
          const relativePageX = event.pageX - initPageX;
          const relativePageY = event.pageY - initPageY;

          // save the new position
          this.left = initLeft + relativePageX;
          this.top = initTop + relativePageY;

          // apply pan to background position as well
          this.backgroundLeft = initBackgroundLeft + (event.pageX - initPageX);
          this.backgroundTop = initBackgroundTop + (event.pageY - initPageY);

          this.transform();
        });

        event.preventDefault();
      }
    });


    // unhook eventhandler created on mousedown
    document.body.addEventListener('mouseup', () => {
      if (mousePanFunction) {
        document.body.removeEventListener('mousemove', mousePanFunction);
        mousePanFunction = null;

        this.element.classList.remove('panning');
      }
    });
  }

  // enable hooking of connectors
  enableHook() {
    // triggered when shuffling completes
    document.body.addEventListener('mouseup', () => {
      if (!this.dummyXibleConnectors || !this.dummyXibleNode) {
        return;
      }

      // destroy the temporary connector & dummyXibleNode
      this.dummyXibleNode.delete();
      this.dummyXibleConnectors.forEach(conn => conn.delete());
      this.dummyXibleConnectors = null;
      this.dummyXibleNode = null;
      this.dummyIo = null;

      // ensure we deselect the dummyXibleNode
      this.deselect();
    });
  }

  static get inputElementNameList() {
    return ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'];
  }

  static isInputElement(el) {
    if (!el) {
      return true;
    }

    return el.classList.contains('content') || this.inputElementNameList.indexOf(el.nodeName) > -1;
  }
}

module.exports = XibleEditor;

},{"./XibleEditorFlow.js":12,"./XibleEditorNode.js":13,"./XibleEditorNodeSelector.js":14,"events":2}],19:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"./wrapperinstance.js":17,"dup":11}],20:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./XibleEditorConnector.js":11,"./XibleEditorNode.js":13,"./wrapperinstance.js":17,"dup":12}],21:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"./XibleEditorConnector.js":11,"./wrapperinstance.js":17,"dup":13}],22:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"./XibleEditorNode.js":13,"dup":14}]},{},[15])(15)
});