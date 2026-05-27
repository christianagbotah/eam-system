// Self-sustaining dev server wrapper
// Periodically hits localhost to prevent sandbox idle timeout
const { spawn } = require('child_process');
const http = require('http');

const SERVER_PORT = 3000;
const KEEPALIVE_INTERVAL = 25000; // Ping every 25 seconds

function ping() {
  const req = http.get(`http://localhost:${SERVER_PORT}/`, (res) => {
    let data = '';
    res.on('data', () => {});
    res.on('end', () => {
      console.log(`[${new Date().toISOString()}] Keepalive ping: ${res.statusCode}`);
    });
  });
  req.on('error', (e) => {
    console.error(`[${new Date().toISOString()}] Keepalive ping failed: ${e.message}`);
  });
  req.setTimeout(10000, () => req.destroy());
}

// Start Next.js dev server
console.log(`[${new Date().toISOString()}] Starting Next.js dev server...`);
const child = spawn('npx', ['next', 'dev', '-p', String(SERVER_PORT)], {
  stdio: ['inherit', 'inherit', 'inherit'],
  env: {
    ...process.env,
    DATABASE_URL: 'mysql://ifleetpro_user:myjesus4mE2018@vps.lightworldtech.com:3306/ifleetpro_eam_system',
    DB_HOST: 'vps.lightworldtech.com',
    DB_PORT: '3306',
    DB_USER: 'ifleetpro_user',
    DB_PASSWORD: 'myjesus4mE2018',
    DB_NAME: 'ifleetpro_eam_system',
  }
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Server exited with code ${code}. Restarting in 3s...`);
  setTimeout(() => {
    // Restart self
    const self = spawn(process.execPath, [__filename], {
      stdio: 'inherit',
      env: process.env
    });
    self.on('exit', () => process.exit(self.exitCode || 0));
  }, 3000);
});

// Wait for server to be ready, then start keepalive pings
function waitForServer() {
  const req = http.get(`http://localhost:${SERVER_PORT}/`, (res) => {
    console.log(`[${new Date().toISOString()}] Server is ready! Starting keepalive pings every ${KEEPALIVE_INTERVAL/1000}s`);
    setInterval(ping, KEEPALIVE_INTERVAL);
  });
  req.on('error', () => {
    setTimeout(waitForServer, 3000);
  });
  req.setTimeout(5000, () => {
    req.destroy();
    setTimeout(waitForServer, 3000);
  });
}

setTimeout(waitForServer, 5000);

// Handle signals
process.on('SIGTERM', () => { child.kill('SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { child.kill('SIGINT'); process.exit(0); });
