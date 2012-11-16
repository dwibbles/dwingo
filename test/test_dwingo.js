var dwingo = require('../dwingo');
var db = new dwingo('test');

var options = {
  collection: 'profiles',
  query: { access_token: 'foo' },
  fields: {}
}
db.read(options, function(error, result) {
  if (error)
    console.log(error);
  else
    console.log(result);
});

var options = {
  collection: 'profiles',
  query: {
    access_token: 'foo'
  }
};

db.readOne(options, function(err, profile) {
  if (err)
    console.log(err);
  else 
    console.log(profile);
});


var options = {
  collection: 'profiles',
  query: { _id: 'foo' },
  update: {
    '$addToSet': {
      services: {
        service: 'foo',
        oauth: 'foo',
        profile: 'foo'
      }
    }
  }
};

db.update(options, function(error, data) {
    if (error)
      console.log(error);
    else if (data === 1)
      console.log(data);
    else
      console.log('unhandled case');
  });
