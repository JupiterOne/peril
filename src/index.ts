/*
 do something amazing
*/

async function run() {
  console.log('Module init');

  try {
    //
  } catch (e) {
    console.error(e);
  }
}

run().catch((err) => {
  console.error(
    `Runtime error. ${err.stack || err.toString()}`
  );
  process.exit(1);
});
