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

  const tick$ = xs.periodic(500);

  const dripfeed = Dripfeeder(tick$);
  const df1 = dripfeed.subscribe();
  const df2 = dripfeed.subscribe();
  const df3$ = xs.create();

  function label(s) {
    return function _label(x) {
      return {label: s, value: x}
    }
  }

  const page$ = xs.merge(
    df1.drip$.map(label('df1')),
    df2.drip$.map(label('df2')),
    df3$.map(label('df3'))
  );

  setTimeout(() => {
    df2.unsubscribe();
  }, 4e3);

  setTimeout(() => {
    const df3 = dripfeed.subscribe();
    df3$.imitate(df3.drip$);

    setTimeout(() => {
      df3.unsubscribe();
    }, 3e3)
  }, 6e3);

  setTimeout(() => {
    df1.unsubscribe();
  }, 8e3);

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
