import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// In-memory store: userId -> socket.id mapping
const userSockets = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log('[WS] Client connected:', socket.id);

  // Authenticate: client sends { userId, token }
  socket.on('auth', (data: { userId: string }) => {
    if (data.userId) {
      socket.data.userId = data.userId;
      if (!userSockets.has(data.userId)) {
        userSockets.set(data.userId, new Set());
      }
      userSockets.get(data.userId)!.add(socket.id);
      console.log(`[WS] User ${data.userId} authenticated (${userSockets.get(data.userId)!.size} connections)`);
      socket.emit('auth:success');
    }
  });

  // Allow authenticated sockets to listen for their notifications
  socket.on('subscribe:notifications', (userId: string) => {
    if (userId) {
      socket.join(`notifications:${userId}`);
      console.log(`[WS] Socket ${socket.id} subscribed to notifications:${userId}`);
    }
  });

  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (userId) {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
    }
    console.log('[WS] Client disconnected:', socket.id);
  });
});

// Helper: send event to specific user
function sendToUser(userId: string, event: string, data: unknown): boolean {
  const sockets = userSockets.get(userId);
  if (sockets && sockets.size > 0) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
    return true;
  }
  return false;
}

// Helper: broadcast event to all connected users
function broadcast(event: string, data: unknown): number {
  let count = 0;
  for (const [userId, sockets] of userSockets) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
      count++;
    }
  }
  return count;
}

// HTTP admin endpoint for sending notifications (called from main app APIs)
import { createServer as createHttpServer } from 'http';
const adminServer = createHttpServer();

adminServer.on('request', async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/notify') {
    let body = '';
    req.on('data', (chunk: string) => (body += chunk));
    req.on('end', () => {
      try {
        const { userId, event, data } = JSON.parse(body);
        if (!userId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'userId is required' }));
          return;
        }
        const sent = sendToUser(userId, event || 'notification', data);
        console.log(`[WS Admin] Notified user ${userId}: event="${event || 'notification'}", sent=${sent}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sent }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid request body' }));
      }
    });
  } else if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';
    req.on('data', (chunk: string) => (body += chunk));
    req.on('end', () => {
      try {
        const { event, data } = JSON.parse(body);
        const count = broadcast(event || 'notification', data);
        console.log(`[WS Admin] Broadcast: event="${event || 'notification'}", recipients=${count}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, recipients: count }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid request body' }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        connectedUsers: userSockets.size,
        totalConnections: Array.from(userSockets.values()).reduce((sum, s) => sum + s.size, 0),
      })
    );
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const WS_PORT = 3004;
const ADMIN_PORT = 3005;

httpServer.listen(WS_PORT, () => {
  console.log(`[WS Notification Service] WebSocket running on port ${WS_PORT}`);
});

adminServer.listen(ADMIN_PORT, () => {
  console.log(`[WS Notification Admin] HTTP API running on port ${ADMIN_PORT}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[WS] Received ${signal}, shutting down...`);
  httpServer.close(() => {
    adminServer.close(() => {
      console.log('[WS] All servers closed');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
