const Mocha = require('mocha');
const path = require('path');

const wait = time => new Promise(res => setTimeout(res, time));

const initTests = async () => {
  const mocha = new Mocha({ timeout : process.env.DEBUG_MODE == 'true' ? 10000000 : 60000, watch: true });

  const file_path = path.join(__dirname, 'index.js');
  mocha.addFile(file_path);

  process.stdin.on('data', () => {
    mocha.run(err => {
      process.on('exit', () => {
        process.exit(err);
      });
    });
  });
}

initTests()
.catch(console.log);
