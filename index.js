const appRoot = require('app-root-path');
require('dotenv').config({path: appRoot + '/.env'});

const {createLogger} = require('./lib/logs');
const log = createLogger({name: 'main'});
log.info('▶ starting');

const auth = require('./lib/auth');
const padStart = require('string.prototype.padstart');
const {parallelStreamPages} = require('./lib/stream-pages');
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
  const tokenResponse = await auth.getToken({
    endpoint: 'https://bigbluedigital.api.accelo.com/oauth2/v0/token',
    username: process.env['CLIENTID'],
    password: process.env['CLIENTSECRET'],
  });

  const page$ = parallelStreamPages(
    {accessToken:tokenResponse['access_token']},
    // {},
    'https://bigbluedigital.api.accelo.com/api/v0/activities?_limit=3'
    // 'http://localhost:3001/api/v0/activities?_limit=3'
  )
    .take(10);

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
