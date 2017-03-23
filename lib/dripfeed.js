const {createLogger} = require('../lib/logs');
const log = createLogger({name: 'dripfeed'});
log.info('▶ starting');

const assert = require('assert');
//noinspection NpmUsedModulesInstalled
const xs = require('xstream').default;

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

function Dripfeeder(source$, feederNickname) {
  const feederNick = feederNickname || '[Feeder nickname not set]';
  log.trace({feederNick}, 'starting new Dripfeeder');

  //noinspection ES6ConvertVarToLetConst
  var subscriptions = [];
  //noinspection ES6ConvertVarToLetConst
  var lastSubscriberCount = 0;

  const listener = {
    next: next => {
      if (subscriptions.length < 1) {
        log.trace({feederNick}, 'no-one left to dole out next Drip to...');
        return;
      }
      const nextSink = subscriptions.shift();
      log.trace({feederNick}, `doling out next Drip, to: ${nextSink.nickname || '[nickname not set]'}`);
      nextSink.receive(next);
      subscriptions.push(nextSink);
    },
    complete: () => {
      log.trace({feederNick}, 'source$ completed');
      // todo: send `complete` to all subscriptions
    },
    error: error => {
      log.trace({feederNick}, 'source$ error');
      // todo: ???
    }
  };

  function checkSubscriberCount() {
    const newSubscriberCount = subscriptions.length;
    log.trace({newSubscriberCount, lastSubscriberCount, feederNick}, 'checkSubscriberCount()');

    if (newSubscriberCount > 0 && lastSubscriberCount === 0) {
      log.trace({feederNick}, 'got at least one subscriber; begin listening to source$');
      lastSubscriberCount = newSubscriberCount;
      source$.addListener(listener);
      return
    }

    if (lastSubscriberCount > 0 && newSubscriberCount === 0) {
      log.trace({feederNick}, 'lost all subscribers; stop listening to source$');
      lastSubscriberCount = newSubscriberCount;
      source$.removeListener(listener);
      return
    }

    lastSubscriberCount = newSubscriberCount;
  }

  function subscribe(nickname) {
    const nick = nickname || '';
    log.trace({feederNick}, `subscribe(${nick}) called`);
    const id = Symbol('sink');

    function unsubscribe(){
      log.trace({feederNick}, `unsubscribe(${nick}) called`);
      subscriptions = subscriptions.filter(sub =>
        sub.id !== id
      );
      checkSubscriberCount();
    }

    const drip$ = xs.create({
      start: function(listener) {
        subscriptions.push({
          id,
          nickname,
          receive: nextDrip => {
            listener.next(nextDrip);
          }
        });
        checkSubscriberCount();
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