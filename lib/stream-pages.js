const {relevantProps, createLogger} = require('../lib/logs');
const log = createLogger({name: 'stream-pages'});
log.info('▶ starting');

const URL = require('url').URL;
const fetch = require('node-fetch');
//noinspection NpmUsedModulesInstalled
const xs = require('xstream').default;
const {
  fromMaybe,
  is,
  parseInt,
} = require('sanctuary');

const defaultPageLength = 10;
const pageLength = 50; // max = 50;
const LIMIT = '_limit';
const OFFSET = '_offset';


/**
 *
 * Derived from https://gist.github.com/spion/8c9d8556697ed61108177164e90fb50d
 */
function rethrowError(msg) {
  const newErr = new Error(msg); // placed here to get correct stack
  return e => {
    log.error(relevantProps(e), msg);
    newErr.originalError = e;
    throw newErr;
  }
}

/** getPage :: URL -> Promise Stuff
 *
 * todo: make that type sig more informative
 *
 * @param urlObject
 * @returns {Promise.<{looksPaginated: *, looksLikeLastPage: (*|boolean), requestedPageLength: number, requestedOffset: number, data: T, blob: *}>}
 */
async function getPage(urlObject) {
  const requestedPageLength = fromMaybe(
    defaultPageLength,
    parseInt(10, urlObject.searchParams.get(LIMIT))
  );
  const requestedOffset = fromMaybe(
    0,
    parseInt(10, urlObject.searchParams.get(OFFSET))
  );

  if (urlObject.searchParams.get('_page')) {
    log.warn({urlObject}, `don't use _page, use instead _limit and/or _offset`)
  }

  const response = await fetch(urlObject.toString())
    .catch(rethrowError('network error?'));

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const data = await response.json()
    .catch(rethrowError('response json parse error'));

  const blob = data['response'];

  const looksPaginated = is(Array, blob);

  const looksLikeLastPage = looksPaginated && blob.length < requestedPageLength;

  log.trace({
    looksPaginated,
    pageLength: looksPaginated ? blob.length : undefined,
    firstInPage: looksPaginated ? blob[0] : undefined,
    urlObject
  }, 'getPage() response');


  return {
    looksPaginated,
    looksLikeLastPage,
    requestedPageLength,
    requestedOffset,
    data,
    blob,
  }
}

/** streamPages :: String -> Stream error a
 *
 * If the response looks like one of Accelo's paginated, more than one object
 * will be returned in the stream.
 *
 * parameters `_limit` and `_offset` will be inserted automatically.
 *
 * parameter `_page` will be stripped.
 *
 * NB: This function must never throw exceptions, only send them through the stream!
 * */
function streamPages(url) {
  const reqURL = new URL(url); // nb: URLs are mutable

  const limit = fromMaybe(
    pageLength,
    parseInt(10, `${reqURL.searchParams.get(LIMIT)}`)
  );
  reqURL.searchParams.set(LIMIT, limit);
  reqURL.searchParams.set(OFFSET, 0);
  reqURL.searchParams.delete('_page');

  /**
   * NB: there is nothing to handle exceptions from start()!
   */
  async function start(listener){
    //noinspection ES6ConvertVarToLetConst
    var looksLikeLastPage = true;

    do {
      try {
        let page = await getPage(reqURL);
        listener.next(page.blob);
        let offset = fromMaybe(
          0,
          parseInt(10, reqURL.searchParams.get(OFFSET))
        );
        reqURL.searchParams.set(OFFSET, offset + limit);
        looksLikeLastPage = page.looksLikeLastPage;
      } catch(e) {
        listener.error(e);
        return e;
      }

    } while (!looksLikeLastPage);

    listener.complete();
  }

  function stop(){
    // todo
  }

  return xs.create({
    start, stop
  });
}

const page$ = streamPages('http://localhost:3001/api/v0/activities?_page=2');

page$.addListener({
  next: next => {
    log.debug({next}, 'page$')
  },
  error: error => {
    log.error(relevantProps(error), 'page$')
  },
  complete: () => {
    log.debug('page$ complete')
  }
});

module.exports = {
  streamPages
};