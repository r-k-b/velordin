const {createLogger} = require('../lib/logs');
const log = createLogger({name: 'auth'});
log.info('▶ starting');

const assert = require('assert');
const fetch = require('node-fetch');
const {URL} = require('url');

const scope = 'read(all)';


/** encode :: String -> String -> String
 */
function encode(un, pw) {
  return Buffer.from(`${un}:${pw}`, 'utf8').toString('base64');
}


function hrtimeInMS(diff) {
  return Math.round(diff[0] * 1e3 + diff[1] / 1e6)
}

/**
 *
 * Derived from https://gist.github.com/spion/8c9d8556697ed61108177164e90fb50d
 */
function rethrowError(msg) {
  const newErr = new Error(msg); // placed here to get correct stack
  return error => {
    log.error({error}, msg);
    newErr.originalError = error;
    throw newErr;
  }
}


/** getToken :: Object -> Promise(TokenResponseObject)
 */
async function getToken({endpoint, username, password}) {
  assert(typeof endpoint === 'string', '`options.endpoint` must be a string');
  assert(typeof username === 'string', '`options.username` must be a string');
  assert(typeof password === 'string', '`options.password` must be a string');

  const urlObject = new URL(endpoint);
  urlObject.searchParams.set('grant_type', 'client_credentials');
  urlObject.searchParams.set('scope', scope);

  const reqOptions = {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encode(username, password)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
  };

  log.trace({endpoint: urlObject.toString(), username}, 'new token request');

  const timingStart = process.hrtime();

  const tokenreq = await fetch(urlObject.toString(), reqOptions)
    .catch(rethrowError('network error while fetching token'));

  const reqTime = process.hrtime(timingStart);

  const tokenjson = await tokenreq.json()
    .catch(rethrowError('error while parsing token response json'));

  if (!tokenreq.ok) {
    log.error({tokenjson}, 'token response');
    throw new Error(`Unexpected response from token endpoint (Code ${tokenreq.status}): ${tokenreq.statusText}`);
  }

  if (!tokenjson.access_token || tokenjson.access_token.length !== 64) {
    log.error({tokenjson}, '(malformed?) token response');
    throw new Error('Token response has missing or malformed `access_token');
  }

  log.trace({
    username,
    endpoint: urlObject.toString(),
    latency_ms: hrtimeInMS(reqTime),
  }, 'token request succeeded');

  return tokenjson
}

module.exports = {
  getToken
};