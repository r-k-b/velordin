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
  gets,
  is,
  Left,
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

/* getMock :: Array (String) -> Either Object Object -> Either Object (Array a)
 */
function getMock(path, mocksₑ) {
  return chain(
    mockdata => pipe(
      [
        gets(is(Array), path),
        maybeToEither({message: 'No mock data found at path', mockdata, path})
      ],
      mockdata
    ),
    mocksₑ
  )
}


router.get('/activities',
  async(ctx, next) => {
    const mockₑ = getMock(['get', 'activities', '0'], await mocksfileₚₑ);

    function sendBody(data) {
      try {
        ctx.body = data;
        next();
      } catch (err) {
        ctx.body = {message: err.message};
        ctx.status = err.status || 500
      }
    }

    function sendNothing(msg) {
      ctx.status = 500;
      ctx.body = {message: msg};
      next();
    }

    bimap(sendNothing, sendBody, mockₑ);
  }
);


app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(3001);
