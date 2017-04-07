const appRoot = require('app-root-path');

require('dotenv').config({path: appRoot + '/.env'});

const assert = require('assert');

const {createLogger} = require('./lib/logs');

// const Dripfeeder = require('./lib/dripfeed');

const log = createLogger({name: 'main'});
log.info('▶ starting');

const chalk = require('chalk');

const padStart = require('string.prototype.padstart');

const DraftLog = require('draftlog').into(console);

const auth = require('./lib/auth');

const {
  annotatePageItems,
  parallelStreamPages,
  streamPages,
  flattenArrays,
} = require('./lib/stream-pages');

//noinspection NpmUsedModulesInstalled
const xs = require('xstream').default;

const {
  fromMaybe,
  get,
  is,
  map,
  max,
  reduce,
} = require('sanctuary');

const mainSpinner = console.draft();
let mainSpinnerFrame = 0;
const mainSpinnerFrames = ['▘', '▝', '▗', '▖'];
const mainSpinnerFrameCount = mainSpinnerFrames.length;

function updateMainSpinner() {
  mainSpinnerFrame = (mainSpinnerFrame + 1) % mainSpinnerFrameCount;
  mainSpinner(`${mainSpinnerFrames[mainSpinnerFrame]} Streaming...`);
}

const mainSpinnerTimeout = setInterval(updateMainSpinner, 250);

const itemsSpinner = console.draft();
let itemsSpinnerCount = 0;
function incrementItemsSpinner(latestId) {
  // todo: show rate averages (10 sec, 60 sec, hour, lifetime?)
  itemsSpinner(
    `# Items received: ${
      padStart(itemsSpinnerCount.toString(), 12, '.')
    } (latest ID: ${
      padStart(latestId || '?', 12, '.')
    })`
  );
  itemsSpinnerCount++;
}
incrementItemsSpinner('');

const retriesSpinner = console.draft();
let retriesSpinnerCount = 0;
function incrementRetriesSpinner() {
  retriesSpinner(
    `# Items received: ${
      padStart(retriesSpinnerCount.toString(), 12, '.')
    }`
  );
  retriesSpinnerCount++;
}
incrementRetriesSpinner();



function shortIdList(items) {
  const justIds = map(x => x.id.toString(), items);
  const idLengths = map(x => x.length, justIds);
  const longest = reduce(max, 0, idLengths);
  const padded = map(x => padStart(x, longest, ' '), justIds);
  return padded
}


async function getNewToken() {
  const tokenResponse = await auth.getToken({
    endpoint: 'https://bigbluedigital.api.accelo.com/oauth2/v0/token',
    username: process.env['CLIENTID'],
    password: process.env['CLIENTSECRET'],
  });

  return tokenResponse.accessToken;
}

async function main() {
  const accessToken = await getNewToken();

  const rateLimitTick$ = xs.periodic(200)
    .debug(tick => {
      log.trace({tick}, 'rateLimitTick$')
    });

  const {page$, retry$} = parallelStreamPages(
  // const {page$, retry$} = streamPages(
    {
      accessToken,
      getNewToken,
      // rateLimit$: rateLimitTick$,
      maxRetries: 6,
    },
    // 'https://bigbluedigital.api.accelo.com/api/v0/timers?_limit=24'
    'https://bigbluedigital.api.accelo.com/api/v0/activities'
    // 'http://localhost:3001/api/v0/activities'
  );

  const item$ = page$
    .map(annotatePageItems)
    .compose(flattenArrays);

  const idHigh$ = item$
    .filter(x => parseInt(x.item.id, 10) > 1000);

  const onlySome$ = item$
    .endWhen(idHigh$);



  retry$.addListener({
    next: next => {
      log.debug({next}, 'retry$');
      incrementRetriesSpinner();
    },
    error: error => {
      log.error({error}, 'retry$');
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
      log.info('retry$ complete')
    }
  });

  onlySome$
    .addListener({
      next: next => {
        // log.debug({next_ids: shortIdList(next)}, 'page$');
        log.debug({next}, 'page$');
        incrementItemsSpinner(next.item.id);
      },
      error: error => {
        log.error({error}, 'page$');
        clearInterval(mainSpinnerTimeout);
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
        log.info('page$ complete');
        clearInterval(mainSpinnerTimeout);
      }
    });
}

main()
  .catch(error => {
    log.error({error}, 'main()');
    clearInterval(mainSpinnerTimeout);
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
  });
