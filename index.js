const appRoot = require('app-root-path');
require('dotenv').config({path: appRoot + '/.env'});

const {createLogger} = require('./lib/logs');
const Dripfeeder = require('./lib/dripfeed');
const log = createLogger({name: 'main'});
log.info('▶ starting');

const auth = require('./lib/auth');
const padStart = require('string.prototype.padstart');
const {parallelStreamPages} = require('./lib/stream-pages');
//noinspection NpmUsedModulesInstalled
const xs = require('xstream').default;
const {
  map,
  max,
  reduce,
} = require('sanctuary');


function shortIdList(items) {
  const justIds = map(x => x.id.toString(), items);
  const idLengths = map(x => x.length, justIds);
  const longest = reduce(max, 0, idLengths);
  const padded = map(x => padStart(x, longest, ' '), justIds);
  return padded
}


async function main() {
  // const tokenResponse = await auth.getToken({
  //   endpoint: 'https://bigbluedigital.api.accelo.com/oauth2/v0/token',
  //   username: process.env['CLIENTID'],
  //   password: process.env['CLIENTSECRET'],
  // });
  //
  // const page$ = parallelStreamPages(
  //   {accessToken:tokenResponse['access_token']},
  //   // {},
  //   'https://bigbluedigital.api.accelo.com/api/v0/activities?_limit=3'
  //   // 'http://localhost:3001/api/v0/activities?_limit=3'
  // )
  //   .take(10);

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
}

main()
  .catch(error => {
    log.error({error}, 'main()')
  });
