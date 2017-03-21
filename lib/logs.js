const appRoot = require('app-root-path');
const bunyan = require('bunyan');

const commonOptions = {
  name: '__NOT_SET__',
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

function standardlog(moduleOptions) {
  return Object.assign({}, commonOptions, moduleOptions)
}

/**
 * Usage example:
 *
 *     const log = require('../lib/logs')({name: 'mock-api'});
 *     log.info('▶ starting');
 *
 */
function createLogger(opts) {
  return bunyan.createLogger(
    standardlog(opts)
  );
}

/** relevantProps :: Error -> Object
 *
 * Return interesting properties of an Error instance, as own-properties on
 * a fresh object. (Regular Error objects don't log very well.)
 *
 * @param error
 * @returns {{name, stack, message}}
 */
function relevantProps(error) {
  return {
    relevantProps: {
      name: error.name,
      stack: error.stack,
      message: error.message,
    }
  }
}

module.exports = {
  createLogger,
  relevantProps,
};