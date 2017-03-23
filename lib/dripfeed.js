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
  var lastSubsCount = 0;

  const listener = {
    next: next => {
      if (subscriptions.length < 1) {
        log.trace({feederNick}, 'no-one left to dole out next Drip to...');
        return;
      }
      const nextSink = subscriptions.shift();
      log.trace({feederNick, sinkNick: nextSink.nickname}, 'doling out next Drip');
      nextSink.receive(next);
      subscriptions.push(nextSink);
    },
    complete: () => {
      log.trace({feederNick}, 'source$ completed');
      subscriptions.forEach(sub => {
        log.trace({feederNick, subNick: sub.nickname}, 'completing dripfeed');
        sub.complete();
      });
      subscriptions = [];
      checkSubscriberCount();
    },
    error: error => {
      log.trace({feederNick}, 'source$ error');
      subscriptions.forEach(sub => {
        sub.error(error);
      });
      subscriptions = [];
      checkSubscriberCount();
    }
  };

  function checkSubscriberCount() {
    const newSubsCount = subscriptions.length;
    log.trace({newSubsCount, lastSubsCount, feederNick}, 'checkSubscriberCount()');

    if (newSubsCount > 0 && lastSubsCount === 0) {
      log.trace({feederNick}, 'got at least one subscriber; begin listening to source$');
      lastSubsCount = newSubsCount;
      source$.addListener(listener);
      return
    }

    if (lastSubsCount > 0 && newSubsCount === 0) {
      log.trace({feederNick}, 'lost all subscribers; stop listening to source$');
      lastSubsCount = newSubsCount;
      source$.removeListener(listener);
      return
    }

    lastSubsCount = newSubsCount;
  }

  function subscribe(nickname) {
    const nick = nickname || '';
    log.trace({feederNick, subNick: nick}, 'subscribe() called');
    const id = Symbol('sink');
    //noinspection ES6ConvertVarToLetConst
    var stopped = false;

    function unsubscribe(){
      if (stopped) {
        // log.trace({feederNick, subNick: nick}, 'unsubscribe() ignored');
        return;
      }
      stopped = true;
      const closingSubs = subscriptions.filter(sub => sub.id === id);
      log.trace({feederNick, subNick: nick}, 'unsubscribe() called');
      subscriptions = subscriptions.filter(sub => sub.id !== id);
      closingSubs.forEach(sub => {
        sub.complete();
      });
      checkSubscriberCount();
    }

    const drip$ = xs.create({
      start: function(listener) {
        subscriptions.push({
          id,
          nickname,
          receive: nextDrip => {
            listener.next(nextDrip);
          },
          complete: () => {
            listener.complete();
          },
          error: (error) => {
            listener.error(error);
          },
        });
        checkSubscriberCount();
      },
      stop: unsubscribe,
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