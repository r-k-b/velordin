const {relevantProps, createLogger} = require('../lib/logs');
const log = createLogger({name: 'mock-api'});
log.info('▶ starting');

const appRoot = require('app-root-path');
const Koa = require('koa');
const app = new Koa();
const yaml = require('js-yaml');
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const {
  bimap,
  chain,
  curry3,
  curry4,
  fromMaybe,
  get,
  gets,
  is,
  Left,
  map,
  maybeToEither,
  max,
  parseInt,
  pipe,
  Right,
} = require('sanctuary');

const defaultPageSize = 10;
const maxPageSize = 50;




/*
 Lacking a formal type system, let's see if a loose kind of "suffix Hungarian" will help...

 xₑ :: Either (U+2091)
 xₘ :: Maybe (U+2098)
 xₚ :: Promise (U+209a)

 xₚₑ :: a Promise containing an Either (or should that be xₑₚ?)
 */


const mocksfileₚₑ =
  fs.readFileAsync(`${appRoot}/tools/mock-api.yml`, 'utf8')
    .then(f => yaml.safeLoad(f))
    .then(Right)
    .catch(error => {
      let s = 'error reading mocks file';
      log.error({readFileError: relevantProps(error)}, s);
      return Left({message: s, error});
    });

const Router = require('koa-router');
const router = new Router({
  prefix: '/api/v0'
});


/** wrapResponse :: a -> Object a
 *
 * Emulate the wrapping that Accelo provides.
 *
 * (there's a better way to write that type signature, right?)
 */
function wrapResponse(data) {
  return {
    "meta": {
      "version": "0.1.1",
      "status": "ok",
      "message": "Everything executed as expected."
    },
    "response": data
  }
}

/** getMock :: Array (String) -> Either Object Object -> Either Object (Array a)
 */
function getMock(path, mocksₑ) {
  return chain(
    mockdata => pipe(
      [
        gets(is(Array), path),
        maybeToEither({message: 'No mock data found at path', path})
      ],
      mockdata
    ),
    mocksₑ
  )
}

/** getPage :: Integer -> Integer -> Array a -> Array a
 */
const getPage = curry3(function _getPage(limit, offset, mocks) {
  return mocks.slice(offset, offset + limit);
});

/** addSimpleEndpoint :: Promise (Either Object Object) -> Router -> String -> Array String -> router
 *
 * Create a simple mock of a "paginated" Accelo endpoint.
 *
 * todo: make that type sig more informative
 */
const addSimpleEndpoint = curry4(function _addSimpleEndpoint(mocksfileₚₑ, router, path, mockpath) {
  log.trace({path}, 'registering simple endpoint');
  return router.get(path,
    async(ctx, next) => {
      // NB: there's nothing to handle exceptions from this function...
      try {
        const mockₑ = getMock(mockpath, await mocksfileₚₑ);
        const limit = max(
          fromMaybe(
            defaultPageSize,
            parseInt(10, ctx.request.query._limit)
          ),
          maxPageSize
        );
        const offset = fromMaybe(
          0,
          parseInt(10, ctx.request.query._offset)
        );
        const pageDataₑ = map(getPage(limit, offset), mockₑ);

        function sendBody(data) {
          ctx.body = wrapResponse(data);
          next();
        }

        function sendNothing(msg) {
          const s = 'nonexistent mock data';
          log.warn({url: ctx.url, msg: msg.message, mockpath}, s);
          ctx.status = 500;
          ctx.body = {message: s, response: msg};
          next();
        }

        bimap(sendNothing, sendBody, pageDataₑ);
      } catch (error) {
        log.error({error: relevantProps(error), url: ctx.url}, 'exception while responding');
        ctx.body = {message: error.message};
        ctx.status = error.status || 500
      }
    }
  );
});

const routerWithSimple = addSimpleEndpoint(mocksfileₚₑ, router, '/activities', ['get', 'activities']);

async function reqLogger(ctx, next) {
  log.trace({method: ctx.method, url: ctx.url}, 'request');
  await next();
}

app
  .use(reqLogger)
  .use(routerWithSimple.routes())
  .use(routerWithSimple.allowedMethods())
  .listen(3001);
