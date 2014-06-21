#!/usr/bin/env node
var async = require('./lib/async');

exports['async.js integration'] = {
  'simple series': {
    setUp: function(done) {
      var self = this;

      self.err = new Error();
      self.called = [];
      self.chain = async.chain()
        .then(function(next){
          self.called.push(1);
          next(null, 1);
        })
        .then(function(next){
          self.called.push(2);
          next(null, 2);
        })
        .then(function(next){
          self.called.push(3);
          next(null, 3);
        });

      done();
    },

    'complete': function(test){
      var self = this;

      self.chain.finish(function(err, results){
        test.ok(!err);
        test.same(results, [1,2,3]);
        test.same(self.called, [1,2,3]);
        test.done();
      });
    },

    'with error': function(test) {
      var self = this;

      self.chain
        .then(function(next){
          self.called.push(4);
          next(self.err);
        })
        .then(function(next){
          self.called.push(5);
          next();
        })
        .finish(function(err, results){
          test.same(err, self.err);
          test.same(results, [1,2,3, undefined]);
          test.same(self.called, [1,2,3,4]);
          test.done();
        });
    }
  },

  'simple waterfall': {
    setUp: function(done) {
      var self = this;

      self.err = new Error();
      self.called = [];
      self.chain = async.chain()
        .return(function(next){
          self.called.push(1);
          next(null, 1, 'one');
        })
        .return(function(number, word, next){
          self.called.push([number, word]);
          arguments[arguments.length - 1](null, 2);
        })
        .return(function(next){
          self.called.push(3);
          arguments[arguments.length - 1](null, 3);
        });

      done();
    },

    'complete': function(test){
      var self = this;

      self.chain.finish(function(err, results){
        test.ok(!err);
        test.same(results, 3);
        test.same(self.called, [1,[1, 'one'],3]);
        test.done();
      });
    },

    'with error': function(test) {
      var self = this;

      self.chain
        .return(function(next){
          self.called.push(4);
          arguments[arguments.length - 1](self.err);
        })
        .return(function(next){
          self.called.push(5);
          arguments[arguments.length - 1]();
        })
        .finish(function(err, results){
          test.same(err, self.err);
          test.same(results, undefined);
          test.same(self.called, [1,[1, 'one'],3, 4]);
          test.done();
        });
    },

    'with non-matching, shorter, signature in waterfall': function(test) {
      var self = this;

      self.chain
        .return(function(next){
          self.called.push(arguments[arguments.length - 1] == next);
          arguments[arguments.length - 1](null, 'etc');
        })
        .finish(function(err, result){
          test.ok(!err);
          test.same(result, 'etc');
          test.same(self.called, [1,[1, 'one'],3, true]);
          test.done();
        });
    },

    'with non-matching, longer, signature in waterfall': function(test) {
      var self = this;

      self.chain
        .return(function(number, word, next){
          test.same(number, 3);
          self.called.push(arguments[arguments.length - 1] == next);
          arguments[arguments.length - 1](null, 'etc');
        })
        .finish(function(err, result){
          test.ok(!err);
          test.same(result, 'etc');
          test.same(self.called, [1,[1, 'one'],3, true]);
          test.done();
        });
    }
  },

  'simple parallel': {
    setUp: function(done) {
      var self = this;

      self.err = new Error();
      self.called = [];
      self.chain = async.chain()
        .and(function(next){
          setTimeout(function(){
            self.called.push(1);
            next(null, 1, 'one');
          }, 100);
        })
        .and(function(next){
          setTimeout(function(){
            self.called.push(2);
            next(null, 2, 'two');
          }, 60);
        })

      done();
    },

    'complete': function(test) {
      var self = this;

      self.chain
        .and(function(next) {
          setTimeout(function(){
            self.called.push(3);
            next(null, 3);
          }, 20);
        })
        .finish(function(err, results){
          test.ok(!err);
          test.same(results, [[1, 'one'], [2, 'two'], 3]);
          test.same(self.called, [3, 2, 1]);
          test.done();
        });
    }
  },

  'mixed': {
    setUp: function(done) {
      var self = this;

      self.err = new Error();
      self.called = [];
      self.chain = async.chain()
        .first(function(next){
          self.called.push(1);
          next(null, 1);
        });

      done();
    },

    'series-catch-waterfall-finish': {
      'complete': function(test){
        var self = this;

        self.chain
          .then(function(next){
            self.called.push(2);
            next(null, 2);
          })
          .catch(function(err, results, next){
            test.ok(!err);
            test.same(results, [1,2]);
            next();
          })
          .return(function(next){
            self.called.push(3);
            next(null, 3, 'three');
          })
          .return(function(number, word, next){
            self.called.push(4);
            next(null, 4, 'four', 'etc');
          })
          .finish(function(err, number, word, other){
            test.same(self.called, [1,2,3,4]);
            test.same(number, 4);
            test.same(word, 'four');
            test.same(other, 'etc');
            test.done();
          });
      },

      'with error before catch': function(test){
        var self = this;

        self.chain
          .then(function(next){
            self.called.push(2);
            next(self.err);
          })
          .then(function(next){
            self.called.push(2.1); // Skipped
            next(null, 2.1);
          })
          .catch(function(err, results, next){
            test.same(err, self.err);
            test.same(results, [1, undefined]);
            next();
          })
          .return(function(next){
            self.called.push(3);
            next(null, 3, 'three');
          })
          .return(function(number, word, next){
            self.called.push(4);
            next(null, 4, 'four', 'etc');
          })
          .finish(function(err, number, word, other){
            test.same(self.called, [1,2,3,4]);
            test.same(number, 4);
            test.same(word, 'four');
            test.same(other, 'etc');
            test.done();
          });
      },

      'with error after catch': function(test){
        var self = this;

        self.chain
          .then(function(next){
            self.called.push(2);
            next(null, 2);
          })
          .catch(function(err, results, next){
            test.ok(!err);
            test.same(results, [1, 2]);
            next();
          })
          .return(function(next){
            self.called.push(3);
            next(null, 3, 'three');
          })
          .return(function(number, word, next){
            self.called.push(4);
            next(self.err, 4, 'four', 'etc');
          })
          .return(function(number, word, other, next){
            self.called.push(4); // Skipped
            next(null, 4.1, 'four.one', 'etc');
          })
          .finish(function(err, number, word, other){
            test.same(self.called, [1,2,3,4]);
            test.same(number, 4);
            test.same(word, 'four');
            test.same(other, 'etc');
            test.done();
          });
      },

      'with error in catch': function(test){
        var self = this;

        self.chain
          .then(function(next){
            self.called.push(2);
            next(null, 2);
          })
          .catch(function(err, results, next){
            test.ok(!err);
            test.same(results, [1, 2]);
            next(self.err);
          })
          .return(function(next){
            self.called.push(3);
            next(null, 3, 'three');
          })
          .return(function(number, word, next){
            self.called.push(4);
            next(self.err, 4, 'four', 'etc');
          })
          .finish(function(err){
            test.same(self.called, [1,2]);
            test.same(err, self.err);
            test.done();
          });
      },
    },

    'waterfall-catch-series-finish': {
      'complete': function(test){
        var self = this;

        self.chain
          .return(function(returned, next){
            test.same(returned, 1);
            self.called.push(2);
            next(null, 2, 'two');
          })
          .catch(function(err, number, word, next){
            test.ok(!err);
            test.same(number, 2);
            test.same(word, 'two');
            next();
          })
          .then(function(next){
            self.called.push(3);
            next(null, 3);
          })
          .then(function(next){
            self.called.push(4);
            next(null, 4);
          })
          .finish(function(err, results, other){
            test.same(self.called, [1,2,3,4]);
            test.same(results, [3, 4]);
            test.done();
          });
      },

      'with error before catch': function(test){
        var self = this;

        self.chain
          .return(function(returned, next){
            test.same(returned, 1);
            self.called.push(2);
            next(self.err);
          })
          .return(function(next){
            self.called.push(2.1);
            next(null, 2.1, 'two.one');
          })
          .catch(function(err, next){
            test.same(err, self.err);
            next();
          })
          .then(function(next){
            self.called.push(3);
            next(null, 3);
          })
          .then(function(next){
            self.called.push(4);
            next(null, 4);
          })
          .finish(function(err, results, other){
            test.same(self.called, [1,2,3,4]);
            test.same(results, [3, 4]);
            test.done();
          });
      },

      'with error after catch': function(test){
        var self = this;

        self.chain
          .return(function(returned, next){
            test.same(returned, 1);
            self.called.push(2);
            next(null, 2, 'two');
          })
          .catch(function(err, number, word, next){
            test.ok(!err);
            test.same(number, 2);
            test.same(word, 'two');
            next();
          })
          .then(function(next){
            self.called.push(3);
            next(null, 3);
          })
          .then(function(next){
            self.called.push(4);
            next(self.err);
          })
          .then(function(next){
            self.called.push(4.1);
            next(null, 4.1);
          })
          .finish(function(err, results, other){
            test.same(self.err, err);
            test.same(self.called, [1,2,3,4]);
            test.same(results, [3, undefined]);
            test.done();
          });
      },

      'with error in catch': function(test){
        var self = this;

        self.chain
          .return(function(returned, next){
            test.same(returned, 1);
            self.called.push(2);
            next(null, 2, 'two');
          })
          .catch(function(err, number, word, next){
            test.ok(!err);
            test.same(number, 2);
            test.same(word, 'two');
            next(self.err);
          })
          .then(function(next){
            self.called.push(3);
            next(null, 3);
          })
          .then(function(next){
            self.called.push(4);
            next(null, 4);
          })
          .finish(function(err, results, other){
            test.same(self.err, err);
            test.same(self.called, [1,2]);
            test.same(results, undefined);
            test.done();
          });
      }
    },

    'series-catch-finish': {
      'with non-matching, shorter, signature for catch': function(test) {
        var self = this;

        self.chain
          .catch(function(err, next){
            self.called.push(arguments[arguments.length - 1] == next);
            arguments[arguments.length - 1]();
          })
          .finish(function(err){
            test.ok(!err);
            test.same(self.called, [1, true]);
            test.done();
          });
      },

      'with non-matching, longer, signature for catch': function(test) {
        var self = this;

        self.chain
          .catch(function(err, number, word, next){
            test.same(number, [1]);
            self.called.push(arguments[arguments.length - 1] == next);
            arguments[arguments.length - 1]();
          })
          .finish(function(err){
            test.ok(!err);
            test.same(self.called, [1, true]);
            test.done();
          });
      }
    }
  }
}

if (module.id == '.') {
  var reporter = require('nodeunit').reporters.default;
  reporter.run(exports);
}
