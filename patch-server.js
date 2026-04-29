#!/usr/bin/env node
/**
 * Patches .next/standalone/server.js to inject error handling at the top.
 * This runs AFTER next build and BEFORE git commit.
 * No need to change cPanel startup file — it stays as .next/standalone/server.js
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Check if already patched
if (content.includes('__EAM_PATCHED__')) {
  console.log('server.js already patched, skipping.');
  process.exit(0);
}

const patch = `
// __EAM_PATCHED__ — Error diagnostics injected by build script
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --enable-source-maps';

// Bypass V8 ignore-listed frames for full stack traces
const _origPrepare = Error.prepareStackTrace;
Error.prepareStackTrace = function(err, trace) {
  return err.toString() + '\\n' + trace.map(function(frame) {
    var fn = frame.getFunctionName() || frame.getMethodName() || '<anonymous>';
    var file = frame.getFileName() || '<unknown>';
    var line = frame.getLineNumber() || 0;
    var col = frame.getColumnNumber() || 0;
    return '    at ' + fn + ' (' + file + ':' + line + ':' + col + ')';
  }).join('\\n');
};

process.on('unhandledRejection', function(reason) {
  console.error('\\n===== UNHANDLED REJECTION =====');
  console.error(reason instanceof Error ? (reason.stack || reason.message) : String(reason));
  console.error('===== END =====\\n');
});

process.on('uncaughtException', function(err) {
  console.error('\\n===== UNCAUGHT EXCEPTION =====');
  console.error(err.stack || err.message);
  console.error('===== END =====\\n');
});

console.log('[server.js] EAM error diagnostics ENABLED — full stack traces active');
// __END_EAM_PATCH__

`;

// Inject patch right after the first line: const path = require('path')
content = content.replace(
  "const path = require('path')",
  "const path = require('path')\n" + patch
);

fs.writeFileSync(serverPath, content, 'utf8');
console.log('server.js patched successfully — error diagnostics injected.');
