const {createLogger} = require('../lib/logs');
const log = createLogger({name: 'stream-pages'});
log.info('▶ starting');

const assert = require('assert');
const Dripfeeder = require('../lib/dripfeed');
const {URL} = require('url');
const fetch = require('node-fetch');
//noinspection NpmUsedModulesInstalled
const xs = require('xstream').default;
const flattenSequentially = require('xstream/extra/flattenSequentially').default;
const {
  fromMaybe,
  is,
  map,
  max,
  min,
  parseInt,
  range,
  toMaybe,
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
  return error => {
    log.error({error}, msg);
    newErr.originalError = error;
    throw newErr;
  }
}


function hrtimeInMS(diff) {
  return Math.round(diff[0] * 1e3 + diff[1] / 1e6)
}


/** getPage :: URL -> Promise Stuff
 *
 * todo: make that type sig more informative
 *
 * @param {object} options
 * @param {string} [options.accessToken]
 * @param {URL} urlObject
 * @returns {Promise.<{looksPaginated: *, looksLikeLastPage: (*|boolean), requestedPageLength: number, requestedOffset: number, data: T, blob: *}>}
 */
async function getPage(options, urlObject) {
  assert(typeof options === 'object', '`options` must be an object');
  assert(urlObject instanceof URL, '`urlObject` must be a `new URL()`');

  const requestedPageLength = fromMaybe(
    defaultPageLength,
    parseInt(10, urlObject.searchParams.get(LIMIT))
  );
  const requestedOffset = fromMaybe(
    0,
    parseInt(10, urlObject.searchParams.get(OFFSET))
  );

  log.trace({
    requestedPageLength,
    requestedOffset,
    urlObject,
    hasAccessToken: !!options.accessToken,
  }, 'getPage() init');

  const fetchOptions = options.accessToken
    ? {
      headers: {
        'Authorization': `Bearer ${options.accessToken}`
      }
    }
    : {};

  if (urlObject.searchParams.get('_page')) {
    log.warn({urlObject}, 'donʼt use _page, use instead _limit and/or _offset')
  }

  const timingStart = process.hrtime();

  const response = await fetch(urlObject.toString(), fetchOptions)
    .catch(rethrowError('network error'));

  const reqTime = process.hrtime(timingStart);

  if (!response.ok) {
    log.error({response, latency_ms: hrtimeInMS(reqTime)}, 'response status not ok');
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const data = await response.json()
    .catch(rethrowError('response json parse error'));

  const blob = data['response'];

  const looksPaginated = is(Array, blob);

  const looksLikeLastPage = looksPaginated && blob.length < requestedPageLength;

  log.trace({
    latency_ms: hrtimeInMS(reqTime),
    looksPaginated,
    pageLength: looksPaginated ? blob.length : undefined,
    // firstInPage: looksPaginated ? blob[0] : undefined,
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


/** streamPages :: Object -> String -> Stream error a
 *
 * Get data from Accelo. When not using a rate limiter, they will be
 * returned in a strictly sequential order.
 *
 * If the response looks like one of Accelo's paginated, more than one object
 * will be returned in the stream.
 *
 * parameters `_limit` and `_offset` will be inserted automatically.
 *
 * parameter `_page` will be stripped.
 *
 * NB: This function must never throw exceptions, only send them through the stream!
 *
 * @param {object} options
 * @param {string} [options.accessToken]
 * @param {int} [options.skipPages] How many "pages" to skip?
 * @param {Stream} [options.rateLimit$] If present, governs the rate at which
 *      requests are made. The content of the stream is ignored.
 * @param {string} url
 * @returns Stream
 * */
function streamPages(options, url) {
  assert(typeof options === 'object', '`options` must be an object');
  assert(typeof url === 'string', '`url` must be a string');

  const rateLimited = !!options.rateLimit$;
  const reqURL = new URL(url); // nb: URLs are mutable
  //noinspection ES6ConvertVarToLetConst
  var stopped = false;
  const skipPages = options.skipPages || 0;

  const limit = fromMaybe(
    pageLength,
    parseInt(10, `${reqURL.searchParams.get(LIMIT)}`)
  );
  const offset = fromMaybe(
    0,
    parseInt(10, `${reqURL.searchParams.get(OFFSET)}`)
  );
  reqURL.searchParams.set(LIMIT, limit);
  reqURL.searchParams.set(OFFSET, offset);

  log.trace({
    skipPages,
    limit,
    offset,
    rateLimited,
    pathname: reqURL.pathname
  }, 'streamPages() init');

  if (reqURL.searchParams.get('_page')) {
    log.warn({reqURL}, 'donʼt use `_page`');
    reqURL.searchParams.delete('_page');
  }

  if (!rateLimited) {
    /**
     * NB: there is nothing to handle exceptions from this function!
     */
    let start = async function (listener) {
      //noinspection ES6ConvertVarToLetConst
      var looksLikeLastPage = true;

      do {
        try {
          let page = await getPage({accessToken: options.accessToken}, reqURL);
          listener.next({
            page: page.blob,
            limit: page.requestedPageLength,
            offset: page.requestedOffset,
            looksLikeLastPage: page.looksLikeLastPage,
            looksPaginated: page.looksPaginated,
          });
          let offset = page.requestedOffset;
          let nextOffset = offset + (limit * skipPages) + limit;
          reqURL.searchParams.set(OFFSET, nextOffset);
          looksLikeLastPage = page.looksLikeLastPage;
        } catch (e) {
          listener.error(e);
          return e;
        }

      } while (!looksLikeLastPage && !stopped);
      // is there a better implementation that doesn't make two reqs when `.take(1)` is used?

      listener.complete();
    };

    let stop = function () {
      stopped = true;
    };

    return xs.create({
      start,
      stop,
    });
  }

  if (rateLimited) {
    let rateLimit$ = options.rateLimit$;

    let earliestTerminatingOffset = Number.MAX_SAFE_INTEGER; // nb: will be mutated

    // Fold immediately emits an event with the Seed, but
    // we want to wait for ticks to come from the rate limiter.
    let offsetToDrop = offset - limit * skipPages - limit;

    let offset$ = rateLimit$
      .fold(
        (offsetAccumulator, x) => offsetAccumulator + limit * skipPages + limit,
        offsetToDrop
      )
      .drop(1);

    // Since the offset only increases, and any non-full result page means
    // any further offsets / pages will necessarily be empty, we can stop the
    // stream at that point.
    let ended$ = offset$.filter(offset => {
      return offset >= earliestTerminatingOffset
    });

    return offset$
      .endWhen(ended$)
      .map(async(offset) => {
        const nextReqURL = new URL(reqURL);
        nextReqURL.searchParams.set(OFFSET, offset);
        let page = await getPage({accessToken: options.accessToken}, nextReqURL);
        if (page.looksLikeLastPage) {
          earliestTerminatingOffset = min(page.requestedOffset, earliestTerminatingOffset)
        }
        return {
          page: page.blob,
          limit: page.requestedPageLength,
          offset: page.requestedOffset,
          looksLikeLastPage: page.looksLikeLastPage,
          looksPaginated: page.looksPaginated,
        }
      })
      .map(xs.fromPromise)
      .compose(flattenSequentially);
  }
}

/**
 *
 * Initiate a fixed number of parallel `getPages()` streams, return a single
 * merged stream.
 *
 * Pages will almost certainly arrive (and be emitted) out of order, so
 * they're wrapped with info that will allow you to reorder them.
 *
 * @param {object} options
 * @param {string} [options.accessToken]
 * @param {int} [options.streams] How many parallel streams to set up
 * @param {stream} [options.rateLimit$] If present, governs the rate at which
 *      requests are made. The content of the stream is ignored.
 * @param {string} url
 * @returns stream
 */
function parallelStreamPages(options, url) {
  assert(typeof options === 'object', '`options` must be an object');
  assert(typeof url === 'string', '`url` must be a string');

  const streams = max(1, options.streams || 6);
  const rateLimited = !!options.rateLimit$;

  log.trace({streams, rateLimited}, 'parallelStreamPages() init');

  const slots = range(0, streams);

  const dripfeedₘ = map(
    rateLimit$ => Dripfeeder(rateLimit$, 'psp'),
    toMaybe(options.rateLimit$)
  );

  const urlObject = new URL(url);
  const baseOffset = fromMaybe(
    0,
    parseInt(10, `${urlObject.searchParams.get(OFFSET)}`)
  );
  const baseLimit = fromMaybe(
    pageLength,
    parseInt(10, `${urlObject.searchParams.get(LIMIT)}`)
  );

  const arrayOfStreams = map(
    slot => {
      const dfₘ = map(
        df => df.subscribe().drip$,
        dripfeedₘ
      );
      const streamUrl = new URL(url);
      const slotOffset = baseOffset + baseLimit * slot;
      streamUrl.searchParams.set(OFFSET, slotOffset);
      const page$ = streamPages(
        Object.assign(
          {},
          options,
          {
            skipPages: streams - 1,
            rateLimit$: rateLimited ? fromMaybe(xs.empty(), dfₘ) : undefined,
          }
        ),
        streamUrl.toString()
      );

      return page$.map(page => ({
        page: page.page,
        slot,
        slotOffset,
        pageOffset: page.offset,
        pageLimit: page.limit,
        looksLikeLastPage: page.looksLikeLastPage,
        looksPaginated: page.looksPaginated,
      }))
    },
    slots
  );

  return xs.merge(...arrayOfStreams);
}


module.exports = {
  getPage,
  streamPages,
  parallelStreamPages,
};