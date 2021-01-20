import { createLogger } from './createLogger';


/*
 do something amazing
*/

async function run() {
  const logger = createLogger(module);
  logger.info('Module init');

  try {
    //
  } catch (e) {
    logger.fatal(e);
  }
}

run().catch((err) => {
  console.error(
    `Runtime error. ${err.stack || err.toString()}`
  );
  process.exit(1);
});
