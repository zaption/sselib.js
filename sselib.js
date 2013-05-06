// Generated by CoffeeScript 1.6.2
var EventEmitter, MIDDLEWARE_INSTANCE_PROPERTIES, SSE, error, middleware, url, _utils,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

EventEmitter = require('events').EventEmitter;

url = require('url');

error = null;

_utils = {};

_utils.typeCheck = function(type, obj) {
  var cls;

  cls = Object.prototype.toString.call(obj).slice(8, -1);
  return obj !== void 0 && obj !== null && cls === type;
};

_utils.extend = function(origin, extension) {
  var key, value;

  if (!extension || !_utils.typeCheck('Object', extension)) {
    return origin;
  }
  for (key in extension) {
    value = extension[key];
    if (origin[key] == null) {
      origin[key] = value;
    }
  }
  return origin;
};

module.exports.utils = _utils;

SSE = (function(_super) {
  __extends(SSE, _super);

  SSE.defaultOptions = {
    retry: 5 * 1000,
    keepAlive: 15 * 1000,
    compatibility: true
  };

  SSE.comment = function(comment, callback) {
    var serialized;

    serialized = ": " + comment + "\n\n";
    if (!callback) {
      return serialized;
    } else {
      return callback(error, serialized);
    }
  };

  SSE.retry = function(time, callback) {
    var serialized;

    serialized = "retry: " + time + "\n";
    if (!callback) {
      return serialized;
    } else {
      return callback(error, serialized);
    }
  };

  SSE.event = function(event, callback) {
    var serialized;

    serialized = event ? "event: " + event + "\n" : '';
    if (!callback) {
      return serialized;
    } else {
      return callback(error, serialized);
    }
  };

  SSE.id = function(id, callback) {
    var serialized;

    if (_utils.typeCheck('Function', id)) {
      callback = id;
      id = null;
    }
    serialized = "id: " + (id ? id : (new Date()).getTime()) + "\n";
    if (!callback) {
      return serialized;
    } else {
      return callback(error, serialized);
    }
  };

  SSE.data = function(data, callback) {
    var piece, serialized, _i, _len;

    serialized = '';
    if (!(_utils.typeCheck('String', data) && (data != null))) {
      data = JSON.stringify(data);
      serialized = data ? "data: " + data + "\n" : '';
    } else {
      data = data.split('\n');
      for (_i = 0, _len = data.length; _i < _len; _i++) {
        piece = data[_i];
        serialized += "data: " + piece + "\n";
      }
    }
    if (serialized) {
      serialized += '\n';
    }
    if (!callback) {
      return serialized;
    } else {
      return callback(error, serialized);
    }
  };

  SSE.message = function(obj, callback) {
    var serialized;

    serialized = [this.id(obj.id), this.event(obj.event), this.data(obj.data)].join('');
    if (!callback) {
      return serialized;
    } else {
      return callback(error, serialized);
    }
  };

  SSE.headers = function(callback) {
    var headerDict;

    headerDict = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'identity'
    };
    if (!callback) {
      return headerDict;
    } else {
      return callback(error, headerDict);
    }
  };

  function SSE(req, res, options) {
    var _this = this;

    this.req = req;
    this.res = res;
    this.options = options != null ? options : {};
    this._dispatchMessage = __bind(this._dispatchMessage, this);
    this.sendRaw = __bind(this.sendRaw, this);
    this.sendData = __bind(this.sendData, this);
    this.sendId = __bind(this.sendId, this);
    this.sendEvent = __bind(this.sendEvent, this);
    this.sendRetry = __bind(this.sendRetry, this);
    this.sendComment = __bind(this.sendComment, this);
    this.get = __bind(this.get, this);
    this.options = _utils.extend(this.options, this.constructor.defaultOptions);
    this.emit('connected');
    this._writeHeaders();
    if (this.options.retry) {
      this.sendRetry(this.options.retry);
    }
    if (this.options.compatibility) {
      this._compatibility();
    }
    if (this.options.keepAlive) {
      this._keepAlive();
    }
    if (!this.lastEventId) {
      this.lastEventId = this.req.headers['last-event-id'] || null;
    }
    if (this.lastEventId) {
      this.emit('reconnected');
    }
    this.res.once('close', function() {
      if (_this._keepAliveTimer) {
        clearTimeout(_this._keepAliveTimer);
      }
      return _this.emit('close');
    });
    this.emit('ready');
  }

  SSE.prototype.get = function(option) {
    var o;

    if (option in this.options) {
      return this.options[option];
    } else {
      throw new Error("Valid options are " + (((function() {
        var _results;

        _results = [];
        for (o in this.options) {
          _results.push(o);
        }
        return _results;
      }).call(this)).join(',')));
    }
  };

  SSE.prototype.set = function(option, value) {
    var o,
      _this = this;

    if (option in this.options) {
      this.options[option] = value;
      switch (option) {
        case 'retry':
          return this.sendRetry(this.options.retry);
        case 'keepAlive':
          return this.once('_keepAlive', function() {
            if (_this._keepAliveTimer) {
              clearTimeout(_this._keepAliveTimer);
            }
            return _this._keepAlive();
          });
        case 'compatibility':
          return this._compatibility();
      }
    } else {
      throw new Error("Valid options are " + (((function() {
        var _results;

        _results = [];
        for (o in this.options) {
          _results.push(o);
        }
        return _results;
      }).call(this)).join(',')));
    }
  };

  SSE.prototype.sendComment = function(comment) {
    return this.sendRaw(this.constructor.comment(comment));
  };

  SSE.prototype.sendRetry = function(time) {
    if (this.options.retry !== time) {
      this.options.retry = time;
    }
    return this.sendRaw(this.constructor.retry(time));
  };

  SSE.prototype.sendEvent = function(event) {
    return this.sendRaw(this.constructor.event(event));
  };

  SSE.prototype.sendId = function(id) {
    return this.sendRaw(this.constructor.id(id));
  };

  SSE.prototype.sendData = function(data) {
    return this.sendRaw(this.constructor.data(data));
  };

  SSE.prototype.sendRaw = function(data) {
    return this.res.write(data);
  };

  SSE.prototype._processAndSendMessage = function(message) {
    return this.sendRaw(this.constructor.message(message));
  };

  SSE.prototype._dispatchMessage = function(message) {
    if (_utils.typeCheck('Object', message)) {
      return this._processAndSendMessage(message);
    } else if (_utils.typeCheck('String', message)) {
      this.sendData(message);
      return this.sendRaw("\n");
    } else if (_utils.typeCheck('Array', message)) {
      return message.forEach(function(msg) {
        return this._dispatchMessage(msg);
      });
    } else {
      throw new Error("Unparsable message. (" + message + ")");
    }
  };

  SSE.prototype._writeHeaders = function() {
    var header, value, _ref, _results;

    _ref = this.constructor.headers();
    _results = [];
    for (header in _ref) {
      value = _ref[header];
      _results.push(this.res.setHeader(header, value));
    }
    return _results;
  };

  SSE.prototype._keepAlive = function() {
    var schedule,
      _this = this;

    schedule = function() {
      return setTimeout((function() {
        _this.sendComment("keepalive " + (Date.now()) + "\n\n");
        _this._keepAliveTimer = schedule();
        return _this.emit('_keepAlive');
      }), _this.options.keepAlive);
    };
    return this._keepAliveTimer = schedule();
  };

  SSE.prototype._compatibility = function() {
    /* XDomainRequest (MSIE8, MSIE9)
    */
    this.sendComment(Array(2049).join(' '));
    /* Remy Sharp's Polyfill support.
    */

    if (this.req.headers['x-requested-with'] === 'XMLHttpRequest') {
      this.res.xhr = null;
    }
    if (url.parse(this.req.url, true).query.lastEventId) {
      return this.lastEventId = url.parse(this.req.url, true).query.lastEventId;
    }
  };

  SSE.prototype.toString = function() {
    var client;

    client = this.req.socket.address();
    return "<SSE " + client.address + ":" + client.port + " (" + client.family + ")>";
  };

  return SSE;

})(EventEmitter);

/* Aliases
*/


SSE.prototype.pub = SSE.prototype._dispatchMessage;

SSE.prototype.publish = SSE.prototype._dispatchMessage;

SSE.prototype.send = SSE.prototype._dispatchMessage;

module.exports = SSE;

/* Connect/Express middleware
*/


MIDDLEWARE_INSTANCE_PROPERTIES = ['sendComment', 'sendRetry', 'sendEvent', 'sendId', 'sendData', 'sendRaw', 'set', 'get', 'toString'];

middleware = function(req, res, options) {
  var callable, property, socket, _i, _len;

  callable = function(message) {
    return this.sse._socket.send(message);
  };
  socket = new SSE(req, res, options);
  for (_i = 0, _len = MIDDLEWARE_INSTANCE_PROPERTIES.length; _i < _len; _i++) {
    property = MIDDLEWARE_INSTANCE_PROPERTIES[_i];
    callable[property] = socket[property];
  }
  callable._socket = socket;
  return callable;
};

module.exports.middleware = function(options) {
  return function(req, res, next) {
    if (req.headers.accept === "text/event-stream") {
      if ((options != null ? options.compatibility : void 0) == null) {
        res.sse = middleware(req, res, options);
      }
    }
    if (next != null) {
      return next();
    }
  };
};
