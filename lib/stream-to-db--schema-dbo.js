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


function pickExtraErrorFields(error) {
  return {
    errorCode: error.code,
    number: error.number,
    state: error.state,
    class: error.class,
    lineNumber: error.lineNumber,
    serverName: error.serverName,
    procName: error.procName,
  }
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
    log.trace({activity}, 'insertOneActivity');
    try {
      const result = await connection
        .request()
        .input(
          'id',
          sql.NVarChar,
          activity.id
        )
        .input(
          'subject',
          sql.NVarChar,
          activity.subject
        )
        .input(
          'parent',
          sql.NVarChar,
          activity.parent
        )
        .input(
          'parent_id',
          sql.NVarChar,
          activity.parent_id
        )
        .input(
          'thread',
          sql.NVarChar,
          activity.thread
        )
        .input(
          'thread_id',
          sql.NVarChar,
          activity.thread_id
        )
        .input(
          'against',
          sql.NVarChar,
          activity.against
        )
        .input(
          'against_type',
          sql.NVarChar,
          activity.against_type
        )
        .input(
          'against_id',
          sql.NVarChar,
          activity.against_id
        )
        .input(
          'owner',
          sql.NVarChar,
          activity.owner
        )
        .input(
          'owner_type',
          sql.NVarChar,
          activity.owner_type
        )
        .input(
          'owner_id',
          sql.NVarChar,
          activity.owner_id
        )
        .input(
          'medium',
          sql.NVarChar,
          activity.medium
        )
        .input(
          'visibility',
          sql.NVarChar,
          activity.visibility
        )
        .input(
          'details',
          sql.NVarChar,
          activity.details
        )
        .input(
          'message_id',
          sql.NVarChar,
          activity.message_id
        )
        .input(
          'date_created',
          sql.DateTime2,
          activity.date_created
        )
        .input(
          'date_started',
          sql.DateTime2,
          activity.date_started
        )
        .input(
          'date_logged',
          sql.DateTime2,
          activity.date_logged
        )
        .input(
          'date_ended',
          sql.DateTime2,
          activity.date_ended
        )
        .input(
          'staff',
          sql.NVarChar,
          activity.staff
        )
        .input(
          'rate',
          sql.NVarChar,
          activity.rate
        )
        .input(
          'rate_charged',
          sql.Float,
          activity.rate_charged
        )
        .input(
          'class',
          sql.NVarChar,
          activity.class
        )
        .input(
          'class_id',
          sql.BigInt,
          activity.class_id
        )
        .input(
          'task',
          sql.NVarChar,
          activity.task
        )
        .input(
          'nonbillable',
          sql.BigInt,
          activity.nonbillable
        )
        .input(
          'billable',
          sql.BigInt,
          activity.billable
        )
        .input(
          'task_id',
          sql.NVarChar,
          activity.task_id
        )
        .input(
          'priority',
          sql.BigInt,
          activity.priority
        )
        .input(
          'priority_id',
          sql.NVarChar,
          activity.priority_id
        )
        .input(
          'createdAt',
          sql.DateTime2,
          activity.createdAt
        )
        .input(
          'updatedAt',
          sql.DateTime2,
          activity.updatedAt
        )
        .query(`
INSERT INTO dbo.activities (
  [id],
  [subject],
  [parent],
  [parent_id],
  [thread],
  [thread_id],
  [against],
  [against_type],
  [against_id],
  [owner],
  [owner_type],
  [owner_id],
  [medium],
  [visibility],
  [details],
  [message_id],
  [date_created],
  [date_started],
  [date_logged],
  [date_ended],
  [staff],
  [rate],
  [rate_charged],
  [class],
  [class_id],
  [task],
  [nonbillable],
  [billable],
  [task_id],
  [priority],
  [priority_id],
  [createdAt],
  [updatedAt]
) VALUES (
  @id,
  @subject,
  @parent,
  @parent_id,
  @thread,
  @thread_id,
  @against,
  @against_type,
  @against_id,
  @owner,
  @owner_type,
  @owner_id,
  @medium,
  @visibility,
  @details,
  @message_id,
  @date_created,
  @date_started,
  @date_logged,
  @date_ended,
  @staff,
  @rate,
  @rate_charged,
  @class,
  @class_id,
  @task,
  @nonbillable,
  @billable,
  @task_id,
  @priority,
  @priority_id,
  @createdAt,
  @updatedAt
)
`);

      return result
    } catch (error) {
      const msg = 'getSomeActivities failed';
      log.error({error}, msg);
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
