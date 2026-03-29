process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error('Stack:', err.stack);
  process.exit(99);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(98);
});

// Force stdout to flush after every write
const origWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function(...args) {
  const result = origWrite(...args);
  // Try to flush
  if (typeof process.stdout.flushSync === 'function') {
    try { process.stdout.flushSync(); } catch(e) {}
  }
  return result;
};

// Now require and run the workflow
require('./rally-workflow-v9.8.3-final.js');
