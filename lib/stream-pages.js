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
 * @typedef {Object} PageStreamRetryStreamPair
 * @param {stream} page$
 * @param {stream} retry$
 */


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

/**
 * setTimeout, but as a Promise.
 *
 * @param {int} ms=1
 * @param {any} [resolveWith]
 * @returns {Promise}
 */
function wait(ms = 1, resolveWith) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(resolveWith);
    }, ms)
  })
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
    log.error({response, latencyMs: hrtimeInMS(reqTime)}, 'response status not ok');
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const data = await response.json()
    .catch(rethrowError('response json parse error'));

  const blob = data['response'];

  const looksPaginated = is(Array, blob);

  const looksLikeLastPage = looksPaginated && blob.length < requestedPageLength;

  log.trace({
    latencyMs: hrtimeInMS(reqTime),
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

/** getPageWithRetries :: URL -> Promise Stuff
 *
 * wraps getPage() to allow retries
 *
 * todo: make that type sig more informative
 *
 * @param {object} options
 * @param {int} [options.maxRetries=3] How many retries per request?
 * @param {int} [options.retryDelayMs=100] How long before the first retry?
 * @param {int} [options.maxRetryDelayMs=36e5] Maximum retry delay (not including jitter)
 * @param {int} [options.retryJitterMs=50] How much jitter to add to the first retry?
 * @param {function} [options.notifyRetryAttempt] Will be called when a retry is initiated.
 * @param {string} [options.accessToken]
 * @param {URL} urlObject
 * @returns {Promise.<{looksPaginated: *, looksLikeLastPage: (*|boolean), requestedPageLength: number, requestedOffset: number, data: T, blob: *}>}
 */
async function getPageWithRetries(options, urlObject) {
  let attempts = 0; // nb: will be mutated
  const maxRetries = options.maxRetries || 3;
  const retryDelayMs = options.retryDelayMs || 100;
  const maxRetryDelayMs = options.maxRetryDelayMs || 36e5; // 1hr... too much? not enough?
  const retryJitterMs = options.retryJitterMs || 50;
  const notifyRetryAttempt = options.notifyRetryAttempt || (() => {});
  const jitterMultiplier = retryJitterMs / retryDelayMs;

  while (attempts < maxRetries) {
    try {
      return await getPage(options, urlObject)
    } catch(error) {
      // todo: don't retry hard errors (e.g., 404)
      attempts++;
      const youʼveDoneYourDash = attempts === maxRetries;
      if (youʼveDoneYourDash) {
        break;
      }
      const jitter = Math.random() * jitterMultiplier;
      const backoff = (retryDelayMs + retryDelayMs * jitter) * (10 ** attempts);
      const maxBackoff = maxRetryDelayMs + maxRetryDelayMs * jitter;
      const nextDelay = min(backoff, maxBackoff);
      const retry = {
        attempt: attempts,
        attemptsRemaining: maxRetries - attempts,
        nextDelayMs: youʼveDoneYourDash ? NaN : nextDelay,
        errorStatus: error.status,
        errorStatusCode: error.statusCode, // ?
        errorStatusText: error.statusText,
        errorMessage: error.message,
        errorStack: error.stack,
        url: urlObject.toString(),
      };
      log.trace({retry}, 'getPage() failed; will try again later');
      notifyRetryAttempt(retry);
      await wait(nextDelay);
      log.trace({retry: {
        url: urlObject.toString(),
        waited: nextDelay,
        nextAttempt: attempts + 1,
      }}, 'initiate next retry()')
    }
  }

  throw new Error('retry limit exceeded');
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
 * @param {int} [options.maxPendingRequests=1] How many simultaneous requests
 *      are allowed? (Only applies to rate-limited streams)
 * @param {int} [options.maxRetries=3] How many retries per request?
 * @param {int} [options.retryDelayMs=100] How long before the first retry?
 * @param {int} [options.maxRetryDelayMs=36e5] Maximum retry delay (not including jitter)
 * @param {int} [options.retryJitterMs=50] How much jitter to add to the first retry?
 * @param {Stream} [options.rateLimit$] If present, governs the rate at which
 *      requests are made. The content of the stream is ignored.
 * @param {string} url
 * @returns PageStreamRetryStreamPair
 * */
function streamPages(options, url) {
  assert(typeof options === 'object', '`options` must be an object');
  assert(typeof url === 'string', '`url` must be a string');

  const maxPendingRequests = options.maxPendingRequests || 1;
  const rateLimited = !!options.rateLimit$;
  const reqURL = new URL(url); // nb: URLs are mutable
  let stopped = false; // nb: will be mutated
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

  let sendRetry$Next, sendRetry$Error, sendRetry$Complete;

  const retry$ = xs.create({
    start: listener => {
      sendRetry$Next = next => listener.next(next);
      sendRetry$Error = error => listener.error(error);
      sendRetry$Complete = () => listener.complete();
    },
    stop: () => {},
  });

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
    const start = async function (listener) {
      let looksLikeLastPage = true; // nb: will be mutated

      do {
        try {
          const page = await getPageWithRetries(
            {
              accessToken: options.accessToken,
              notifyRetryAttempt: sendRetry$Next,
            },
            reqURL
          );
          listener.next({
            page: page.blob,
            limit: page.requestedPageLength,
            offset: page.requestedOffset,
            looksLikeLastPage: page.looksLikeLastPage,
            looksPaginated: page.looksPaginated,
          });
          const offset = page.requestedOffset;
          const nextOffset = offset + (limit * skipPages) + limit;
          reqURL.searchParams.set(OFFSET, nextOffset);
          looksLikeLastPage = page.looksLikeLastPage;
        } catch (e) {
          listener.error(e);
          return e;
        }

      } while (!looksLikeLastPage && !stopped);
      // is there a better implementation that doesn't make two reqs when `.take(1)` is used?
      sendRetry$Complete;
      listener.complete();
    };

    const stop = function () {
      stopped = true;
    };

    const page$ = xs.create({
      start,
      stop,
    });

    return {
      page$,
      retry$,
    }
  }

  if (rateLimited) {
    let earliestTerminatingOffset = Number.MAX_SAFE_INTEGER; // nb: will be mutated
    let pendingRequests = 0; // nb: will be mutated

    // Ignore rate limit drips when we've got too many requests in flight.
    const rateLimit$ = options.rateLimit$
      .filter(() => {
        const tooBusy = pendingRequests >= maxPendingRequests;
        if (tooBusy) {
          log.trace({
            maxPendingRequests,
            pendingRequests,
          }, 'too many pending requests; ignoring rate limit drip')
        }

        return !tooBusy;
      });


    // Fold immediately emits an event with the Seed, but
    // we want to wait for ticks to come from the rate limiter.
    const offsetToDrop = offset - limit * skipPages - limit;

    const offset$ = rateLimit$
      .fold(
        (offsetAccumulator, x) => offsetAccumulator + limit * skipPages + limit,
        offsetToDrop
      )
      .drop(1);

    // Since the offset only increases, and any non-full result page means
    // any further offsets / pages will necessarily be empty, we can stop the
    // stream at that point.
    // todo: Does this cut off late responses?
    const ended$ = offset$.filter(offset => {
      const ended = offset >= earliestTerminatingOffset;
      if (ended) {
        sendRetry$Complete();
      }
      return ended;
    });

    const page$ = offset$
      .endWhen(ended$)
      .map(async(offset) => {
        const nextReqURL = new URL(reqURL);
        nextReqURL.searchParams.set(OFFSET, offset);
        pendingRequests++;
        const page = await getPageWithRetries(
          {
            accessToken: options.accessToken,
            notifyRetryAttempt: sendRetry$Next,
          },
          nextReqURL
        );
        // fixme: decrement pendingRequests even if getPage throws/rejects
        pendingRequests--;
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

    return {
      page$,
      retry$,
    };
  }
}

/**
 *
 * Initiate a fixed number of parallel `getPages()` streams, return two
 * streams; One is the merged stream of pages, the other emits events
 * when transient (retryable) errors are encountered.
 *
 * Pages will almost certainly arrive (and be emitted) out of order, so
 * they're wrapped with info that will allow you to reorder them.
 *
 * @param {object} options
 * @param {string} [options.accessToken]
 * @param {int} [options.streams] How many parallel streams to set up
 * @param {int} [options.maxPendingRequests=1] How many simultaneous requests are allowed per stream?
 * @param {int} [options.maxRetries=3] How many retries per request?
 * @param {int} [options.retryDelayMs=100] How long before the first retry?
 * @param {int} [options.maxRetryDelayMs=36e5] Maximum retry delay (not including jitter)
 * @param {int} [options.retryJitterMs=50] How much jitter to add to the first retry?
 * @param {stream} [options.rateLimit$] If present, governs the rate at which
 *      requests are made. The content of the stream is ignored.
 * @param {string} url
 * @returns PageStreamRetryStreamPair
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

  const arrayOfStreamPairs = map(
    slot => {
      const dfₘ = map(
        df => df.subscribe().drip$,
        dripfeedₘ
      );
      const streamUrl = new URL(url);
      const slotOffset = baseOffset + baseLimit * slot;
      streamUrl.searchParams.set(OFFSET, slotOffset);
      const {page$, retry$} = streamPages(
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

      return {
        page$: page$.map(page => ({
          page: page.page,
          slot,
          slotOffset,
          pageOffset: page.offset,
          pageLimit: page.limit,
          looksLikeLastPage: page.looksLikeLastPage,
          looksPaginated: page.looksPaginated,
        })),
        retry$: retry$,
      }
    },
    slots
  );

  const arrayOfPageStreams = arrayOfStreamPairs.map(pair => pair.page$);
  const arrayOfRetryStreams = arrayOfStreamPairs.map(pair => pair.retry$);

  return {
    page$: xs.merge(...arrayOfPageStreams),
    retry$: xs.merge(...arrayOfRetryStreams),
  };
}


module.exports = {
  getPage,
  getPageWithRetries,
  streamPages,
  parallelStreamPages,
};