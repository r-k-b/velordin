const appRoot = require('app-root-path');
require('dotenv').config({path: appRoot + '/.env'});

const {createLogger} = require('./lib/logs');
const log = createLogger({name: 'main'});
log.info('▶ starting');

const auth = require('./lib/auth');
const {streamPages} = require('./lib/stream-pages');

// 'http://localhost:3001/api/v0/activities?_page=2'
// 'https://bigbluedigital.api.accelo.com/api/v0/activities?_page=2'

async function main() {
  const tokenResponse = await auth.getToken({
    endpoint: 'https://bigbluedigital.api.accelo.com/oauth2/v0/token',
    username: process.env['CLIENTID'],
    password: process.env['CLIENTSECRET'],
  });

  const page$ = streamPages(
    {accessToken:tokenResponse['access_token']},
    'https://bigbluedigital.api.accelo.com/api/v0/activities?_page=2'
  )
    .take(1);

  page$.addListener({
    next: next => {
      log.debug({next: 'next'}, 'page$')
    },
    error: error => {
      log.error({error}, 'page$')
    },
    complete: () => {
      log.debug('page$ complete')
    }
  });
}

main();
