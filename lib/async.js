var async = module.exports = _clone(require('async'));

var AsyncChain = function AsyncChain(){
  this._blocks = [];
  this._currentType = null;
  this._buffer = null;

  return this;
}

AsyncChain.prototype.first = AsyncChain.prototype.then = function(fn){
  // Always start as series
  this._push('series', fn);
  return this;
}

AsyncChain.prototype.return = function(fn){
  // Switch to waterfall automatically
  if (this._currentType === 'series') {
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

    switch (method) {
      case 'catch':
        lastFn = _bindArgs(fns[0], context, fns[0].length - 1, lastFn);
      break;
      case 'waterfall':
        for (var i = 0; i < fns.length; i++) {
          fns[i] = _bindArgsWaterfall(fns[i], context, fns[i].length - 1);
        }
      default:
        lastFn = _bind(async[method], context, fns, lastFn);
      break;
    }
  }

  lastFn();
}

AsyncChain.prototype._push = function(type, fn) {
  this._nextBlock(type);
  this._buffer.push(fn);
}

/**
 * Change type
 */
AsyncChain.prototype._nextBlock = function(type, force) {
  if (!force && type === this._currentType) return;

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


function _clone(obj) {
  var newObj = {};
  for (var prop in obj) {
    newObj[prop] = obj[prop];
  }
  return newObj;
}

function _bind(method, context, fns, cb) {
  return function(err){
    if (err) return cb(err);
    method.call(context, fns, cb);
  };
}

function _bindArgs(method, context, length, cb) {
  return function(){
    method.apply(context, _fill(arguments, length, cb));
  };
}

function _bindArgsWaterfall(method, context, length) {
  return function(){
    if (arguments.length === length + 1) return method.apply(context, arguments);
    var args = Array.prototype.slice.apply(arguments);
    var cb = args.pop();
    method.apply(context, _fill(args, length, cb));
  };
}

function _fill(args, size, cb) {
  args = Array.prototype.slice.call(args, 0, size);
  args[size] = cb;
  return args;
}
