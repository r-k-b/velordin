const appRoot = require('app-root-path');
require('dotenv').config({path: appRoot + '/.env'});

const {createLogger} = require('./lib/logs');
const log = createLogger({name: 'main'});
log.info('▶ starting');

// const {streamPages} = require('./lib/stream-pages');
//
// const page$ = streamPages('http://localhost:3001/api/v0/activities?_page=2')
//   .take(2);
//
// page$.addListener({
//   next: next => {
//     log.debug({next}, 'page$')
//   },
//   error: error => {
//     log.error({error}, 'page$')
//   },
//   complete: () => {
//     log.debug('page$ complete')
//   }
// });

const auth = require('./lib/auth');

auth.getToken({
  endpoint: 'https://bigbluedigital.api.accelo.com/oauth2/v0/token',
  // endpoint: 'http://requestb.in/sl6nkisl',
  username: process.env['CLIENTID'],
  password: process.env['CLIENTSECRET'],
  // username: process.env['CLIENTID'],
  // password: 'CLIENTSECRET',
}).catch(error => {
  log.error({error}, 'getToken failed');
});