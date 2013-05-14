var _ = require('underscore'),
    async = require('async');
    
module.exports = async;

var AsyncChain = function AsyncChain(){
  this._blocks = [];
  this._currentType = null;
  this._buffer = null;
  
  return this;
}

AsyncChain.prototype.first = AsyncChain.prototype.then = function(fn){
  this._push('series', fn);
  return this;
}

AsyncChain.prototype.return = function(fn){
  // Switch to waterfall automatically
  if (this._currentType == 'series') {
    this._currentType = 'waterfall';
  }  
  this._push('waterfall', fn);
  return this;  
}

AsyncChain.prototype.and = function(fn){
  this._push('parallel', fn, true);
  return this;
}

AsyncChain.prototype.catch = function(fn){
  this._push('catch', fn, true);
  return this;  
}

AsyncChain.prototype.wait = function(ms){
  return this.then(function(next){
    setTimeout(next, ms);
  });
}

AsyncChain.prototype.finish = function(done){
  this._nextBlock();
  
  var context = async,
      lastFn = done;

  while (this._blocks.length) {
    var block = this._blocks.pop(),
        method = block[0],
        fns = block[1];

    switch (block[0]) {
      case 'catch':
        lastFn = _bindArgs(fns[0], context, lastFn);
      break;
      case 'waterfall':
        // for (var i = 0; i < fns.length; i++) {
        //   fns[i] = function(){
        //     if (arguments.length != innerFn.length) return arguments[arguments.length - 1]('exit');
        //     innerFn();
        //   }
        // }
      default:
        lastFn = _bind(async[method], context, fns, lastFn);
      break;      
    }
  }
  
  lastFn();
}

function _bind(method, context, fns, cb) {
  return function(err){
    if (err) return cb(err);
    method.call(context, fns, cb);
  }
}

function _bindArgs(method, context, cb) {
  return function(){
    method.apply(context, Array.prototype.slice.apply(arguments).concat(cb));    
  }
}

AsyncChain.prototype._push = function(type, fn) {
  this._nextBlock(type);  
  this._buffer.push(fn);
}

/**
 * Change type
 */
AsyncChain.prototype._nextBlock = function(type, force) {
  if (!force && type == this._currentType) return;
  
  if (this._buffer) {
    this._blocks.push([this._currentType, this._buffer]);
  }

  if (!type) return; // Finish
  this._currentType = type;
  this._buffer = [];  
}

// Easily start a chain
module.exports.chain = function(options){
  return new AsyncChain(options);
}
