const appRoot = require('app-root-path');
require('dotenv').config({path: appRoot + '/.env'});

const {createLogger} = require('../lib/logs');
const log = createLogger({name: 'store'});
log.info('▶ starting');

const {getToken, getFreshToken} = require('../lib/auth');

const creds = {
  endpoint: 'https://bigbluedigital.api.accelo.com/oauth2/v0/token',
  username: process.env['CLIENTID'],
  password: process.env['CLIENTSECRET'],
};

async function main() {
  const tokenInfo = await getToken(creds);

  log.info({token: tokenInfo.accessToken}, 'token info received');

  const tokenInfo2 = await getToken(creds);

  log.info({token: tokenInfo2.accessToken}, 'second token info received')
}

main()
  .catch(error => {
    log.error({error}, 'exception from main()')
  });