var events = require('events');
var util = require('util');
var mongo = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
var Server = mongo.Server;
var Db = mongo.Db;
var server = new Server('localhost', 27017, {auto_reconnect: true});

var Database = function(name) {
  var self = this;

  events.EventEmitter.call(this);
  this._q = [];
  this._connected = false;
  this.on('error', function(error) {
    console.error(error);
  });
  this.on('connected', function(db) {
    var action = self._q;
    self._connected = true;
    self._client = db;
    for (var i in action) {
      self['_'+action[i][0]].call(self, action[i][1], action[i][2]);
    }
  });

  db = new Db(name, server, {safe: true});
  db.open(function(error, db) {
    if (error)
      self.emit('error', error);
    else
      self.emit('connected', db);
  });

};

util.inherits(Database, events.EventEmitter);

Database.prototype._create = function(options, callback) {
  this._client.collection(options.collection, function(error, collection) {
    if (error) {
      return callback(error, null);
    } else {
      collection.findOne(options.query, function(error, document) {
        if (error)
          return callback(error, null);
        return callback(null, document);
      });
    }
  });
};

Database.prototype._readOne = function(options, callback) {
  this._client.collection(options.collection, function(error, collection) {
    if (error) {
      return callback(error, null);
    } else {
      collection.findOne(options.query, function(error, document) {
        if (error)
          return callback(error, null);
        return callback(null, document);
      });
    }
  });
};

Database.prototype._read = function(options, callback) {
  this._client.collection(options.collection, function(error, collection) {
    if (error) {
      return callback(error, null);
    } else {
      collection.find(options.query, options.fields).toArray(function(error, resultSet) {
        if (error)
          return callback(error, null);
        return callback(null, resultSet);
      }); 
    }
  });
};

Database.prototype._update = function(options, callback) {
  this._client.collection(options.collection, function(error, collection) {
    if (error) {
      return callback(error, null);
    } else {
      collection.update(options.query, options.update, {safe: true}, function(error, result) {
        if (error)
          return callback(error, null);
        return callback(null, result); 
      });
    }
  });
};

Database.prototype._queueOrExecute = function(action, options, callback) {
  if (this._connected)
    this['_'+action].call(options, callback);
  else
    this._q.push([action, options, callback]); 
};

Database.prototype.create = function(options, callback) {
  this._queueOrExecute('create', options, callback);
};

Database.prototype.read = function(options, callback) {
  this._queueOrExecute('read', options, callback);
};

Database.prototype.readOne = function(options, callback) {
  this._queueOrExecute('readOne', options, callback);
};

Database.prototype.update = function(options, callback) {
  this._queueOrExecute('update', options, callback);
};

module.exports = Database;
