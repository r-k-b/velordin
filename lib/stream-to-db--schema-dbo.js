const assert = require('assert');

const {createLogger} = require('../lib/logs');

const log = createLogger({name: 'stream-to-db'});
log.info('▶ starting');

const {
  curry2,
  fromMaybe,
  get,
  joinWith,
  is,
  map,
  prop,
  reduce,
} = require('sanctuary');

const sql = require('mssql');

sql.on('error', function logSqlError(error) {
  debugger;
  log.error({error}, 'logSqlError Event');
});


function pickExtraErrorFields(error) {
  const safeError = error || {};
  return {
    message: safeError['message'],
    stack: safeError['stack'],
    errorCode: safeError['code'],
    number: safeError['number'],
    state: safeError['state'],
    class: safeError['class'],
    lineNumber: safeError['lineNumber'],
    serverName: safeError['serverName'],
    procName: safeError['procName'],
  }
}

const activityColumns = [
  {
    name: 'id',
    sqlType: sql.NVarChar,
  },
  {
    name: 'subject',
    sqlType: sql.NVarChar,
  },
  {
    name: 'parent',
    sqlType: sql.NVarChar,
  },
  {
    name: 'parent_id',
    sqlType: sql.NVarChar,
  },
  {
    name: 'thread',
    sqlType: sql.NVarChar,
  },
  {
    name: 'thread_id',
    sqlType: sql.NVarChar,
  },
  {
    name: 'against',
    sqlType: sql.NVarChar,
  },
  {
    name: 'against_type',
    sqlType: sql.NVarChar,
  },
  {
    name: 'against_id',
    sqlType: sql.NVarChar,
  },
  {
    name: 'owner',
    sqlType: sql.NVarChar,
  },
  {
    name: 'owner_type',
    sqlType: sql.NVarChar,
  },
  {
    name: 'owner_id',
    sqlType: sql.NVarChar,
  },
  {
    name: 'medium',
    sqlType: sql.NVarChar,
  },
  {
    name: 'visibility',
    sqlType: sql.NVarChar,
  },
  {
    name: 'details',
    sqlType: sql.NVarChar,
  },
  {
    name: 'message_id',
    sqlType: sql.NVarChar,
  },
  {
    name: 'date_created',
    sqlType: sql.DateTime2,
  },
  {
    name: 'date_started',
    sqlType: sql.DateTime2,
  },
  {
    name: 'date_logged',
    sqlType: sql.DateTime2,
  },
  {
    name: 'date_ended',
    sqlType: sql.DateTime2,
  },
  {
    name: 'staff',
    sqlType: sql.NVarChar,
  },
  {
    name: 'rate',
    sqlType: sql.NVarChar,
  },
  {
    name: 'rate_charged',
    sqlType: sql.Float,
  },
  {
    name: 'class',
    sqlType: sql.NVarChar,
  },
  {
    name: 'class_id',
    sqlType: sql.BigInt,
  },
  {
    name: 'task',
    sqlType: sql.NVarChar,
  },
  {
    name: 'nonbillable',
    sqlType: sql.BigInt,
  },
  {
    name: 'billable',
    sqlType: sql.BigInt,
  },
  {
    name: 'task_id',
    sqlType: sql.NVarChar,
  },
  {
    name: 'priority',
    sqlType: sql.BigInt,
  },
  {
    name: 'priority_id',
    sqlType: sql.NVarChar,
  },
  {
    name: 'createdAt',
    sqlType: sql.DateTime2,
  },
  {
    name: 'updatedAt',
    sqlType: sql.DateTime2,
  },
];


// getColumnArgNames :: Array(Column) -> String
function getColumnArgNames(columns) {
  const names = map(col => `[${prop('name', col)}]`, columns);
  return joinWith(', ', names)
}


function getColumnVarNames(columns) {
  const names = map(col => `@${prop('name', col)}`, columns);
  return joinWith(', ', names)
}


function setupAddSqlInput(srcObject) {
  return curry2(function addSqlInput(request, column) {
    const name = prop('name', column);
    const sqlType = prop('sqlType', column);
    assert(!!name, 'column name must be provided');
    assert(!!sqlType, 'column sql type must be provided');

    return request.input(
      name,
      sqlType,
      srcObject[name]
    )
  });
}


function _getSomeActivities(connection) {
  return async function getSomeActivities() {
    try {
      const result = await connection
        .request()
        .query(`SELECT TOP 5 t.* FROM accelo.velordin.activities t`);

      return result
    } catch (error) {
      log.error({error}, 'getSomeActivities failed');
      throw new Error('getSomeActivities failed')
    }
  }
}

function _insertOneActivity(connection) {
  return async function insertOneActivity(activity) {
    log.trace({activityId: prop('id', activity)}, 'insertOneActivity');
    try {
      const addSqlInput = setupAddSqlInput(activity);

      const request = await connection.request();

      const withInputs = reduce(addSqlInput, request, activityColumns);

      const command = `
        INSERT INTO dbo.activities (${getColumnArgNames(activityColumns)}) 
        VALUES (${getColumnVarNames(activityColumns)})
      `;

      const result = withInputs.query(command);

      return result
    } catch (error) {
      const msg = 'getSomeActivities failed';
      log.error({error: pickExtraErrorFields(error)}, msg);
      throw new Error(msg)
    }
  }
}


function _hangup(connection) {
  return function hangup() {
    log.trace(
      {},
      'closing connection'
    );
    return connection.close();
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
    log.trace(
      {server: sqlConfig.server, database: sqlConfig.database},
      'opening connection'
    );
    const connection = await sql.connect(sqlConfig);

    return {
      connection,
      hangup: _hangup(connection),
      // getSomeActivities: _getSomeActivities(connection),
      insertOneActivity: _insertOneActivity(connection),
    }
  } catch (error) {
    const msg = 'sql.connect failed';
    log.error({error}, msg);
    throw new Error(msg);
  }
};
