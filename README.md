# Async, chained! ![Project status](https://secure.travis-ci.org/jupiter/async-chained.png?branch=master)

[Async.js](https://github.com/caolan/async) (*async*) is a great shortcut for restraining deeply nested functions and callbacks.  This module adds a chainable API to:

1. enable easy switching between series, waterfall and parallel async flows
2. reduce callbacks within a flow

## Example

Note: It is important to understand how non-chainable *async* works to appreciate this example.

```
  var async = require('async-chained');  	  

  async.chain()
    // Waterfall – expect a returned value from callback
    .first(function(next){
      fetchSomething('id', next)
    })
    .return(function(returnedObj, next){
      if (!returnedObj) return next()
      
  	  returnedObj.markRead(next);
    })    
    
    // Series
    .then(function(next){
      persistChanges(5000, next);
    })
    
    // Switch to parallel
    .and(fetchRandom)
    .and(function(done){
      fetchRelated('id', done)
    })
    
    // Finish Chain
    .finish(function(err, results){
      if (err) return cb(err);
      
      cb(null, results[0], results[1]);
    });
	
```

## API

- **chain**() start a chain
- chain.**first**(fn) / chain.**then**(fn) `function(cb)` run in series
- chain.**return**(fn) `function(arg1…n, cb)` where arg1…n is the expected arguments to be returned from the previously called callback
- chain.**and**(fn) `function(cb)` run in parallel
- chain.**catch**(err, results, cb) enable error handling before continuing with cb
OR chain.**catch**(err, waterfallResult1…n, cb) to return all arguments as per waterfall
- chain.**finish**(err, results) errors from previous callbacks from the start, or if there was a **catch** after the last one

## Compatibility

This module will attempt to extend a shallow clone of whatever version *async* you already have.  The module therefore makes available all the methods already available on standard *async*.  Perhaps, if we can establish that the 'chain' method name wouldn't clash with standard *async*, we could just extend without cloning.

## License

(See LICENSE)