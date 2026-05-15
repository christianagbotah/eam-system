#!/usr/bin/env node
/**
 * Cloud Run entry point.
 * Ensures the server binds to 0.0.0.0:PORT (required by Cloud Run).
 * This wraps the Next.js standalone server.js
 */

'use strict';

// Cloud Run requires the server to listen on PORT (default 8080)
process.env.PORT = process.env.PORT || '8080';
// Cloud Run requires binding to 0.0.0.0 (not localhost)
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Source map support for better error traces
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --enable-source-maps';

console.log('[entrypoint] Starting EAM server on ' + process.env.HOSTNAME + ':' + process.env.PORT);

// Load the Next.js standalone server
require('./server.js');
