const appRoot = require('app-root-path');
require('dotenv').config({path: appRoot + '/.env'});

const {createLogger} = require('../lib/logs');
const log = createLogger({name: 'stream-to-db-scratch'});
log.info('▶ starting');

const chalk = require('chalk');

const S2DB = require('../lib/stream-to-db--schema-dbo');

const demoActivity = {
  'id': '419362',
  'subject': 'CV for Ceridwyn',
  'parent': 'activities/419186',
  'parent_id': '419186',
  'thread': 'activities/419186',
  'thread_id': '419186',
  'against': 'milestones/3591',
  'against_type': 'milestone',
  'against_id': '3591',
  'owner': 'contacts/5208',
  'owner_type': 'affiliation',
  'owner_id': '5208',
  'medium': 'email',
  'visibility': 'all',
  'details': 'LOGGED: Inbound email from mickm@mprec.org.au',
  'message_id': '<SY3PR01MB04427A619FC1104DC10ABBE39C060@SY3PR01MB0442.ausprd01.prod.outlook.com>',
  'date_created': '2017-04-17 22:48:01.000',
  'date_started': undefined,
  'date_logged': '2017-04-17 22:48:01.000',
  'date_ended': undefined,
  'staff': '0',
  'rate': undefined,
  'rate_charged': undefined,
  'class': '1',
  'class_id': 1,
  'task': '23469',
  'nonbillable': undefined,
  'billable': undefined,
  'task_id': '23469',
  'priority': 3,
  'priority_id': '3',
  'createdAt': '2017-04-17 22:51:22.000',
  'updatedAt': '2017-04-17 22:51:22.000',
};

async function main(dbStream) {
  try {
    const result = await dbStream.insertOneActivity(demoActivity);
    log.info({result}, 'test');
  } catch(error) {
    const msg = 'couldn\'t do the thing';
    log.warn({error}, msg);
    dbStream.hangup();
    throw new Error(msg)
  }
}


const dbStreamP = S2DB({
  dbuser: process.env['DBUSER'],
  dbpass: process.env['DBPASS'],
  dburl: 'builent.database.windows.net',
  dbname: 'accelo',
});

dbStreamP.then(main).catch(error => {
  log.error({error}, 'error while starting main');
});
