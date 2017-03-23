const {createLogger} = require('../lib/logs');
const log = createLogger({name: 'dripfeed'});
log.info('▶ starting');

const assert = require('assert');
//noinspection NpmUsedModulesInstalled
const xs = require('xstream').default;
const {
  max,
} = require('sanctuary');

/*

We'll be provided a stream that emits 'drips' regularly.

Return ___ that evenly shares out these drips to a dynamic number of
listeners.
And allows (un)subscribing.

```
const dripfeed = Dripfeeder(tick$);
const df1 = dripfeed.subscribe();
// do something with `df1.drip$`...
const df2 = dripfeed.subscribe();
// do something with `df2.drip$`...
df2.unsubscribe();

// time passes...
df1.unsubscribe();

```

*/

function Dripfeeder(source$) {
  log.trace('starting new Dripfeeder');

  //noinspection ES6ConvertVarToLetConst
  var subscriptions = [];

  // todo: only Listen when there are Subscribers
  source$.addListener({
    next: next => {
      if (subscriptions.length < 1) {
        log.trace('no-one left to dole out next Drip to');
        return;
      }
      log.trace('doling out next Drip');
      nextSink = subscriptions.shift();
      nextSink.receive(next);
      subscriptions.push(nextSink);
    },
    complete: () => {
      log.trace('source$ completed');
      // todo: send `complete` to all subscriptions
    },
    error: error => {
      log.trace('source$ error');
      // todo: ???
    }
  });

  function subscribe() {
    log.trace('subscribe() called');
    const id = Symbol('sink');

    function unsubscribe(){
      log.trace('unsubscribe() called');
      subscriptions = subscriptions.filter(sub =>
        sub.id !== id
      );
    }

    const drip$ = xs.create({
      start: function(listener) {
        subscriptions.push({
          id,
          receive: nextDrip => {
            listener.next(nextDrip);
          }
        });
      },
      stop: function() {
        unsubscribe();
      }
    });

    const df = {
      unsubscribe,
      drip$,
    };

    return df;
  }

  return {
    subscribe
  };
}


module.exports = Dripfeeder;