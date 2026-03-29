const fs = require('fs');
const logFile = '/home/z/my-project/download/mp-debug.log';

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
  process.stdout.write(line);
}

// Signal handlers
['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGUSR1', 'SIGUSR2'].forEach(sig => {
  process.on(sig, (code) => {
    log(`SIGNAL: ${sig} received`);
    process.exit(128 + (process._rawDebug ? 1 : 0));
  });
});

process.on('exit', (code) => {
  log(`EXIT: code=${code}`);
});

process.on('uncaughtException', (err) => {
  log(`UNCAUGHT: ${err.message}\n${err.stack}`);
  process.exit(99);
});

process.on('unhandledRejection', (reason, p) => {
  log(`UNHANDLED REJECTION: ${reason}\nPromise: ${p}`);
  process.exit(98);
});

// Also track memory
setInterval(() => {
  const mem = process.memoryUsage();
  log(`MEMORY: rss=${Math.round(mem.rss/1024/1024)}MB heap=${Math.round(mem.heapUsed/1024/1024)}/${Math.round(mem.heapTotal/1024/1024)}MB`);
}, 30000);

log('STARTING workflow');
require('./rally-workflow-v9.8.3-final.js');
