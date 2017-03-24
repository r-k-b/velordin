const {createLogger} = require('../lib/logs');
const log = createLogger({name: 'dripfeed'});
log.info('▶ starting');

const assert = require('assert');
//noinspection NpmUsedModulesInstalled
const xs = require('xstream').default;

/*

We'll be provided a stream that emits 'drips' at its own discretion.

Return a closure that evenly shares out these drips to a dynamic number of
listeners, allows (un)subscribing, and completes dependent streams when
the source stream completes.

# Example

```javascript
const startTiming = process.hrtime();
const tick$ = xs.periodic(500).take(8);

const dripfeed = Dripfeeder(tick$, 'primary');
const df1 = dripfeed.subscribe('df1');
const df2 = dripfeed.subscribe('df2');

function label(s) {
  return function _label(x) {
    const diff = process.hrtime(startTiming);
    return {
      label: s,
      value: x,
      timing_ms: Math.floor(diff[0] * 1e3 + diff[1] / 1e6)
    }
  }
}

const df1_dripfeed = Dripfeeder(df1.drip$, 'secondary');
const df1a = df1_dripfeed.subscribe('df1a');
const df1b = df1_dripfeed.subscribe('df1b');

const page$ = xs.merge(
  df1a.drip$.map(label('df1a')),
  df1b.drip$.map(label('df1b')),
  df2.drip$.map(label('df2'))
);

setTimeout(() => {
  df2.unsubscribe();
}, 2e3);

setTimeout(() => {
  df1a.unsubscribe();
}, 6e3);

setTimeout(() => {
  df1b.unsubscribe();
}, 6e3);

// setTimeout(() => {
//   df1b.unsubscribe();
// }, 9e3);

page$.addListener({
  next: next => {
    // log.debug({next_ids: shortIdList(next)}, 'page$')
    log.debug({next}, 'page$')
  },
  error: error => {
    log.error({error}, 'page$')
  },
  complete: () => {
    log.debug('page$ complete')
  }
});
```

*/

function Dripfeeder(source$, feederNickname) {
  const feederNick = feederNickname || '[Feeder nickname not set]';
  log.trace({feederNick}, 'starting new Dripfeeder');

  //noinspection ES6ConvertVarToLetConst
  var subscriptions = [];
  //noinspection ES6ConvertVarToLetConst
  var nextSubOrd = 0;
  //noinspection ES6ConvertVarToLetConst
  var lastSubsCount = 0;

  const listener = {
    next: next => {
      if (subscriptions.length < 1) {
        log.trace({feederNick}, 'no-one left to dole out next Drip to...');
        return;
      }
      const nextSub = subscriptions.shift();
      log.trace({feederNick, subNick: nextSub.nickname, subOrdinal: nextSub.subOrdinal}, 'doling out next Drip');
      nextSub.receive(next);
      subscriptions.push(nextSub);
    },
    complete: () => {
      log.trace({feederNick}, 'source$ completed');
      subscriptions.forEach(sub => {
        log.trace({feederNick, subNick: sub.nickname, subOrdinal: sub.subOrdinal}, 'completing dripfeed');
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
    const subOrdinal = nextSubOrd;
    nextSubOrd++;
    const nick = nickname || '';
    log.trace({feederNick, subNick: nick, subOrdinal}, 'subscribe() called');
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
      log.trace({feederNick, subNick: nick, subOrdinal}, 'unsubscribe() called');
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
          subOrdinal,
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