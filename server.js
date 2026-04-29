/**
 * Production server for cPanel Passenger deployment.
 * Uses standard Next.js (require('next') + app.prepare()) instead of standalone
 * to avoid WebAssembly/undici OOM crash on CloudLinux.
 *
 * Passenger startup file: server.js
 */

const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const { parse } = require('url');

const dir = __dirname;

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg;
  const logFile = path.join(dir, 'eam-startup.log');
  try { fs.appendFileSync(logFile, line + '\n'); } catch(e) {}
  console.log(line);
}

log('=== EAM Server Starting ===');
log('Node: ' + process.version);
log('PORT: ' + process.env.PORT);
log('DIR: ' + dir);

// Check .env
if (fs.existsSync(path.join(dir, '.env'))) {
  log('.env found at project root');
} else {
  log('WARNING: .env not found at project root!');
}

// Check Prisma client
const prismaPaths = [
  path.join(dir, 'node_modules', '.prisma', 'client'),
  path.join(dir, 'prisma', 'prebuilt', '.prisma', 'client'),
  path.join(dir, 'src', 'generated', 'prisma'),
];
prismaPaths.forEach(function(p) {
  if (fs.existsSync(p)) log('Prisma client found at: ' + p);
});

const dev = false;
const next = require('next');
const app = next({ dev, dir });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

app.prepare().then(function() {
  createServer(function(req, res) {
    var parsedUrl = parse(req.url, true);
    var urlPath = parsedUrl.pathname;

    // Log API requests
    if (urlPath.startsWith('/api/')) {
      log('API: ' + req.method + ' ' + urlPath);
    }

    // Serve .next/static files directly for performance
    if (urlPath.startsWith('/_next/static/')) {
      var staticPath = path.join(dir, '.next', 'static', urlPath.replace('/_next/static/', ''));
      if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
        var ext = path.extname(staticPath);
        var mimeTypes = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.webp': 'image/webp',
        };
        res.writeHead(200, {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        fs.createReadStream(staticPath).pipe(res);
        return;
      }
    }

    // Serve public files directly
    if (!urlPath.startsWith('/api') && !urlPath.startsWith('/_next/data')) {
      var publicPath = path.join(dir, 'public', urlPath);
      if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
        res.writeHead(200);
        fs.createReadStream(publicPath).pipe(res);
        return;
      }
    }

    // Everything else goes to Next.js
    handle(req, res, parsedUrl).catch(function(err) {
      log('ERROR: ' + req.method + ' ' + urlPath + ' - ' + err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  }).listen(PORT, '0.0.0.0', function() {
    log('=== EAM ready on http://0.0.0.0:' + PORT + ' ===');
  });
}).catch(function(err) {
  log('ERROR starting server: ' + err.message);
  log(err.stack);
  process.exit(1);
});

// Error handling
process.on('unhandledRejection', function(reason) {
  log('Unhandled rejection: ' + (reason instanceof Error ? reason.stack : reason));
});
process.on('uncaughtException', function(err) {
  log('Uncaught exception: ' + err.message);
  log(err.stack);
});
