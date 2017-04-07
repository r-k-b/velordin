const assert = require('assert');

const {createLogger} = require('../lib/logs');

const log = createLogger({name: 'stream-to-db'});
log.info('▶ starting');

const {
  is,
} = require('sanctuary');

const sql = require('mssql');

sql.on('error', function logSqlError(error) {
  debugger;
  log.error({error}, 'logSqlError Event');
});


function _getSomeActivities(cnxion) {
  return async function getSomeActivities() {
    try {
      const result = await cnxion
        .request()
        .query(`SELECT TOP 5 t.* FROM accelo.dbo.activities t`);

      return result
    } catch (error) {
      log.error({error}, 'getSomeActivities failed');
      throw new Error('getSomeActivities failed')
    }
  }
}


module.exports = async function dbSetup(passedOptions) {
  assert(is(Object, passedOptions), 'options are required');
  assert(is(String, passedOptions.dbuser), 'db username is required');
  assert(is(String, passedOptions.dbpass), 'db password is required');
  assert(is(String, passedOptions.dburl), 'database url is required');
  assert(is(String, passedOptions.dbname), 'database name is required');

  const sqlConfig = {
    user: passedOptions.dbuser,
    password: passedOptions.dbpass,
    server: passedOptions.dburl,
    database: passedOptions.dbname,

    options: {
      encrypt: true,
    }
  };

  try {
    const connection = await sql.connect(sqlConfig);

    return {
      connection,
      getSomeActivities: _getSomeActivities(connection),
    }
  } catch (error) {
    const msg = 'sql.connect failed';
    log.error({error}, msg);
    throw new Error(msg);
  }
};
