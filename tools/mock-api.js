const log = require('../lib/logs')({name: 'mock-api'});
log.info('starting');

const appRoot = require('app-root-path');
const Koa = require('koa');
const app = new Koa();
const yaml = require('js-yaml');
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const {
  bimap,
  chain,
  curry2,
  curry4,
  fromMaybe,
  get,
  gets,
  is,
  Left,
  map,
  maybeToEither,
  pipe,
  Right,
} = require('sanctuary');


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
      log.error({readFileError: error}, s);
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
    "meta" : {
      "version" : "0.1.1",
      "status" : "ok",
      "message" : "Everything executed as expected."
    },
    "response" : data
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

/** getPage :: Integer -> Array (Array a) -> Array a
 */
const getPage = curry2(function _getPage(page, mocks) {
  const got = get(is(Array), `${page}`, mocks);
  return fromMaybe([], got);
});

/** addSimpleEndpoint :: Promise (Either Object Object) -> Router -> String -> Array String -> router
 *
 * Create a simple mock of a paginated Accelo endpoint.
 *
 * todo: make that type sig more informative
 */
const addSimpleEndpoint = curry4(function _addSimpleEndpoint(mocksfileₚₑ, router, path, mockpath) {
  log.trace({path}, 'registering simple endpoint');
  return router.get(path,
    async(ctx, next) => {
      const mockₑ = getMock(mockpath, await mocksfileₚₑ);
      const page = ctx.request.query.page - 1 || 0;
      const pageDataₑ = map(getPage(page), mockₑ);

      function sendBody(data) {
        try {
          ctx.body = wrapResponse(data);
          next();
        } catch (error) {
          log.warn({error, url: ctx.url}, '500 error while responding');
          ctx.body = {message: error.message};
          ctx.status = error.status || 500
        }
      }

      function sendNothing(msg) {
        const s = 'nonexistent mock data';
        log.warn({url: ctx.url, msg: msg.message, mockpath}, s);
        ctx.status = 500;
        ctx.body = {message: s, response: msg};
        next();
      }

      bimap(sendNothing, sendBody, pageDataₑ);
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
