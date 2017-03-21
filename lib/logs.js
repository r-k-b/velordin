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

function createLogger(opts) {
  return bunyan.createLogger(
    standardlog(opts)
  );
}


module.exports = createLogger;