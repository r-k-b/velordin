const {createLogger, relevantProps} = require('./lib/logs');
const log = createLogger({name: 'main'});
log.info('▶ starting');

const {streamPages} = require('./lib/stream-pages');

const page$ = streamPages('http://dlocalhost:3001/api/v0/activities?_page=2');

page$.addListener({
  next: next => {
    log.debug({next}, 'page$')
  },
  error: error => {
    log.error(relevantProps(error), 'page$')
  },
  complete: () => {
    log.debug('page$ complete')
  }
});