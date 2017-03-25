const {createLogger} = require('../lib/logs');
const log = createLogger({name: 'auth'});
log.info('▶ starting');

const assert = require('assert');
const fetch = require('node-fetch');
const {URL} = require('url');
const Loki = require('lokijs');

const scope = 'read(all)';
const db = new Loki({clone: true});
const accessTokens = db.addCollection('accessTokens');
const tokensByFreshness = accessTokens
  .addDynamicView('tokenExpiry')
  .applySimpleSort('tokenExpiresAfter', true);

// todo: apply ttl, so really old tokens don't take up resources

/**
 * @typedef {object} TokenResponseObject
 * @param {string} deployment_name
 * @param {string} access_token 64 characters
 * @param {string} account_id 42 characters?
 * @param {string} token_type E.g., `Bearer`
 * @param {string} deployment_uri E.g., `bigbluedigital.accelo.com`
 * @param {string} deployment E.g., `bigbluedigital`
 * @param {int} expires_in Milliseconds. An absolute reference time isn't
 *      provided, approximate that yourself.
 * @param {object} "account_details" Stuff like username, email, locale info,
 *      access permissions, user defined titles, etc etc.
 */

/**
 * @typedef {TokenResponseObject} TokenInfo
 * @param {string} accessToken because I don't want to deal with snake_case
 *      hogwash in my code
 * @param {int} requestInitiated When the token request was sent to
 *      Accelo (ms since Epoch)
 * @param {int} requestCompleted When the token response was received
 *      (ms since Epoch)
 * @param {int} tokenExpiresAfter Conservative guess at when the token
 *      expires, based on `requestInitiated` (ms since Epoch)
 * @param {int} tokenExpiresBefore Wider guess at when the token expires,
 *      based on `requestCompleted` (ms since Epoch)
 */

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


/** getFreshToken :: Object -> Promise(TokenInfo)
 *
 * Fetch a new Service App Access Token from Accelo.
 *
 * @param {object} options
 * @param {string} options.endpoint
 * @param {string} options.username
 * @param {string} options.password
 * @returns {Promise.<TokenResponseObject>}
 */
async function getFreshToken(options) {
  const {endpoint, username, password} = options;
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

  log.trace(
    {endpoint: urlObject.toString(), username},
    'new request for a fresh access token'
  );

  const timingStart = process.hrtime();
  const requestInitiated = (new Date()).getTime();
  const tokenreq = await fetch(urlObject.toString(), reqOptions)
    .catch(rethrowError('network error while fetching token'));
  const requestCompleted = (new Date()).getTime();

  const reqTime = process.hrtime(timingStart);

  const tokenjson = await tokenreq.json()
    .catch(rethrowError('error while parsing token response json'));

  if (!tokenreq.ok) {
    log.error({tokenjson}, 'token response');
    throw new Error(
      'Unexpected response from token endpoint' +
      ` (Code ${tokenreq.status}): ${tokenreq.statusText}`
    );
  }

  const accessToken = tokenjson['access_token'];

  if (!accessToken || accessToken.length !== 64) {
    log.error({tokenjson}, '(malformed?) token response');
    throw new Error('Token response has missing or malformed `access_token');
  }

  const expiresIn = tokenjson.expires_in;

  const tokenInfo = Object.assign({}, tokenjson, {
    accessToken,
    requestInitiated,
    requestCompleted,
    tokenExpiresAfter: expiresIn + requestInitiated,
    tokenExpiresBefore: expiresIn + requestCompleted,
  });

  accessTokens.insert(tokenInfo);

  log.trace({
    username,
    endpoint: urlObject.toString(),
    latencyMs: hrtimeInMS(reqTime),
    savedToCache: true,
  }, 'token request succeeded');


  return tokenInfo
}

/** getToken :: Object -> Promise(TokenInfo)
 *
 * Return a "looks fresh" token from the store, or from Accelo if the store
 * has no fresh tokens.
 *
 * Use `getFreshToken()` to skip the cache check.
 *
 * @param {object} options
 * @param {string} options.endpoint
 * @param {string} options.username
 * @param {string} options.password
 * @returns {Promise.<TokenResponseObject>}
 */
async function getToken(options) {
  const now = (new Date()).getTime();
  const onlyFreshTokens = tokensByFreshness
    .applyFind({tokenExpiresAfter: {'$gt': now}})
    .data();

  const freshestToken = onlyFreshTokens[0];

  switch (!!freshestToken) {
    case true:
      log.trace('fresh access token found in cache');
      return freshestToken;

    case false:
      return await getFreshToken(options)
  }
}


module.exports = {
  getToken,
  getFreshToken,
};