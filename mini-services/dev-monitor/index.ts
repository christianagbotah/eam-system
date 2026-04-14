/**
 * Dev Server Monitor - Auto-restarts Next.js dev server if it dies
 * Runs on port 3099 just for health checks
 */
import { execSync, spawn } from 'child_process';

const NEXT_PORT = 3000;
const MONITOR_PORT = 3099;
const MAX_RESTARTS = 100;
const RESTART_DELAY = 3000;
const CHECK_INTERVAL = 5000;

let restartCount = 0;
let nextProcess: ReturnType<typeof spawn> | null = null;
let lastRestart = 0;

function isServerAlive(): boolean {
  try {
    const result = execSync(`ss -tlnp 2>/dev/null | grep ':${NEXT_PORT}'`, { encoding: 'utf-8' });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function startNextServer(): void {
  if (nextProcess) {
    try { nextProcess.kill('SIGTERM'); } catch { /* ignore */ }
  }

  if (Date.now() - lastRestart < RESTART_DELAY) {
    setTimeout(startNextServer, RESTART_DELAY);
    return;
  }
  lastRestart = Date.now();
  restartCount++;

  if (restartCount > MAX_RESTARTS) {
    console.error(`[Monitor] Max restarts (${MAX_RESTARTS}) reached. Giving up.`);
    process.exit(1);
  }

  console.log(`[Monitor] Starting Next.js dev server (restart #${restartCount})...`);

  nextProcess = spawn('npx', ['next', 'dev', '-p', String(NEXT_PORT)], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    env: { ...process.env, NODE_ENV: 'development' },
  });

  nextProcess.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Next] ${msg}`);
  });

  nextProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.error(`[Next:ERR] ${msg}`);
  });

  nextProcess.on('exit', (code) => {
    console.log(`[Monitor] Next.js exited with code ${code}, restarting in ${RESTART_DELAY}ms...`);
    nextProcess = null;
    setTimeout(startNextServer, RESTART_DELAY);
  });
}

// Simple HTTP health check server
const http = require('http');
const server = http.createServer((req: any, res: any) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: isServerAlive() ? 'ok' : 'restarting',
    restartCount,
    uptime: process.uptime(),
    nextPort: NEXT_PORT,
  }));
});

server.listen(MONITOR_PORT, () => {
  console.log(`[Monitor] Health check on port ${MONITOR_PORT}`);
  startNextServer();
});

// Periodic health check
setInterval(() => {
  if (!isServerAlive() && !nextProcess) {
    console.log('[Monitor] Server down and no process running, restarting...');
    startNextServer();
  }
}, CHECK_INTERVAL);
