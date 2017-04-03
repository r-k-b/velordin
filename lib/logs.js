const appRoot = require('app-root-path');
const bunyan = require('bunyan');

function fetchResponseSerialiser(res) {
  if (!res || !res.status) {
    return res
  }
  return {
    status: res.status,
    url: res.url,
    statusText: res.statusText,
    headers: res.headers,
  }
}


const commonOptions = {
  name: 'velordin',
  serializers: {
    err: bunyan.stdSerializers.err,
    error: bunyan.stdSerializers.err,
    req: bunyan.stdSerializers.req,
    res: fetchResponseSerialiser,
    request: bunyan.stdSerializers.req,
    response: fetchResponseSerialiser,
  },
  streams: [
    {
      stream: process.stdout,
      level: 'info',
    },
    {
      type: 'rotating-file',
      path: `${appRoot}/logs/all.log`,
      period: '1d',   // daily rotation
      count: 3,       // keep 3 back copies
      level: 'trace',
    },
  ]
};

const core = bunyan.createLogger(commonOptions);

core.info('Logging initialised');

/**
 * Usage example:
 *
 *     const log = require('../lib/logs')({name: 'mock-api'});
 *     log.info('▶ starting');
 *
 */
function createLogger(passedOpts) {
  // don't mutate passed obj when we `delete` later
  const opts = Object.assign({}, passedOpts);
  const providedName = opts.name || '[not set]';
  delete opts.name;
  const childOpts = Object.assign({}, opts, {
    module: providedName,
  });
  return core.child(childOpts)
}

module.exports = {
  createLogger,
};
