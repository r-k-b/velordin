const appRoot = require('app-root-path');
require('dotenv').config({path: appRoot + '/.env'});

const {createLogger} = require('../lib/logs');
const log = createLogger({name: 'split-stream-scratch'});
log.info('▶ starting');

const chalk = require('chalk');
const xs = require('xstream').default;
const {
  fromMaybe,
  get,
  is,
} = require('sanctuary');

const {flattenArrays} = require('../lib/stream-pages');

const original = [
  0,
  [1, 2, 3],
  [4, "5", 6],
  {foo:7},
  [8, 9, 10],
  "11"
];

const page$ = xs.fromArray(original);

const item$ = flattenArrays(page$);


item$.addListener({
  next: next => {
    log.info({next}, 'item$')
  },
  error: error => {
    log.error({error}, 'item$');
    console.error(
      chalk.red(
        fromMaybe(
          error.toString(),
          get(
            is(String),
            'stack',
            error
          )
        )
      )
    );
    process.exitCode = 1;
  },
  complete: () => {
    log.debug('item$ complete')
  }
});
