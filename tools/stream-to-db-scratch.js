const appRoot = require('app-root-path');
require('dotenv').config({path: appRoot + '/.env'});

const {createLogger} = require('../lib/logs');
const log = createLogger({name: 'stream-to-db-scratch'});
log.info('▶ starting');

const chalk = require('chalk');

const S2DB = require('../lib/stream-to-db');


async function main(dbStream) {
  try {
    const result = await dbStream.getSomeActivities();
    log.info({result}, 'test');
  } catch(error) {
    log.warn({error}, 'couldn\'t get activities');
  }
}


const dbStreamP = S2DB({
  dbuser: process.env['DBUSER'],
  dbpass: process.env['DBPASS'],
  dburl: 'builent.database.windows.net',
  dbname: 'accelo',
});

dbStreamP.then(main).catch(error => {
  log.error({error}, 'error while starting main')
});
