var events = require('events');
var util = require('util');
var mongo = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
var Server = mongo.Server;
var Db = mongo.Db;
var server = new Server('localhost', 27017, {auto_reconnect: true});

var Command = function(args) {
  var self = this;
  this.args = Array.prototype.slice.call(args);
  this.collectionName = this.args[1];
  this.type = this.args[0];
  this.callback = this.args[this.args.length - 1];

  // Remove the command type, collection name, and callback from the args array.
  this.args.splice(0, 2);
  this.args.pop();

  this.handler = function(error, result) {
    if (error) 
      return self.callback(error, null);
    return self.callback(null, result);
  };

  if (this.type === 'update' || this.type === 'create') 
    this.args.push({ safe: true }); // Add safe: true for update or create
  if (this.type !== 'read') 
    this.args.push(this.handler); // Attach handler to args array.
};

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

Database.prototype._create = function() {
  var command = new Command(arguments);

  this._client.createCollection(command.collectionName, function(error, collection) {
    if (error) return command.callback(error, null);
    
    collection.insert.apply(collection, command.args);
  });
};

Database.prototype._readOne = function() {
  var command = new Command(arguments);

  this._client.collection(command.collectionName, function(error, collection) {
    if (error) return command.callback(error, null);
    
    collection.findOne.apply(collection, command.args);
  });
};

Database.prototype._read = function() {
  var command = new Command(arguments);

  this._client.collection(command.collectionName, function(error, collection) {
    if (error) return command.callback(error, null); 
    
    collection.find.apply(collection, command.args).toArray(function(error, resultSet) {
      if (error) return command.callback(error, null);

      return command.callback(null, resultSet);
    }); 
  });
};

Database.prototype._update = function() {
  var command = new Command(arguments);

  this._client.collection(command.collectionName, function(error, collection) {
    if (error) return command.callback(error, null);
    
    collection.update.apply(collection, command.args);
  });
};

Database.prototype._queueOrExecute = function(action, callerArgs) {
  var a = Array.prototype.slice.call(callerArgs); // Calling function's arguments
  a.splice(0, 0, action);

  if (this._connected) {
    this['_'+action].apply(this, a);
  } else {
    this._q.push(a); 
  }
};

Database.prototype.create = function() {
  this._queueOrExecute('create', arguments);
};

Database.prototype.read = function() {
  this._queueOrExecute('read', arguments);
};

Database.prototype.readOne = function() {
  /* Return a document that matches the specified query. If the query finds
   * multiple documents, only get the first matched.
   *
   * @params
   * query - (optional) document that specifies a query
   * projection - (optional) fields to return
   * callback - function to execute.
   *
   * @returns
   * single document
   */
  this._queueOrExecute('readOne', arguments);
};

Database.prototype.update = function() {
  this._queueOrExecute('update', arguments);
};

Database.prototype.ObjectId = function(string) {
  return (string) ? ObjectId(string) : new ObjectId().toString();
};

module.exports = Database;
