/**
 * Production start wrapper for cPanel deployment.
 * Enables source maps and full error stack traces so "ignore-listed frames"
 * is replaced with actual file names and line numbers.
 *
 * cPanel Application Startup file: start.js
 */

'use strict';

// Force-enable source maps so production errors show real source locations
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --enable-source-maps';

// Bypass V8's "ignore-listed frames" by overriding stack preparation
const origPrepare = Error.prepareStackTrace;
Error.prepareStackTrace = function (err, trace) {
  // Format each frame manually — skip the CallSite.isNative() filter
  // so we ALWAYS get real file/line info even for "ignore-listed" frames
  return err.toString() + '\n' + trace.map(function (frame) {
    var fn = frame.getFunctionName() || frame.getMethodName() || '<anonymous>';
    var file = frame.getFileName() || '<unknown>';
    var line = frame.getLineNumber() || 0;
    var col = frame.getColumnNumber() || 0;
    return '    at ' + fn + ' (' + file + ':' + line + ':' + col + ')';
  }).join('\n');
};

// Show full stack on unhandled promise rejections
process.on('unhandledRejection', function (reason) {
  console.error('\n========== UNHANDLED REJECTION ==========');
  if (reason instanceof Error) {
    console.error(reason.stack || reason.message);
  } else {
    console.error(String(reason));
  }
  console.error('========== END REJECTION ==========\n');
});

// Show full stack on uncaught exceptions
process.on('uncaughtException', function (err) {
  console.error('\n========== UNCAUGHT EXCEPTION ==========');
  console.error(err.stack || err.message);
  console.error('========== END EXCEPTION ==========\n');
});

// Log that source maps are enabled
console.log('[start.js] Source maps ENABLED — error traces will show real file:line');

// Now start the real Next.js server
require('./.next/standalone/server.js');
