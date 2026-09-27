import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import apiRouter from './routes/api.js';
import { authRouter } from './routes/auth.js';
import { db } from './db/index.js';
import { TelegramBotManager } from './engine/telegram/telegramBotManager.js';
import { config } from './config/index.js';
import { optionalAuth } from './middleware/auth.js';
import { securityHeaders } from './middleware/security.js';
import { requestLogger } from './middleware/logger.js';
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimiter.js';

const app = express();
const PORT = config.port;

// Trust reverse proxy for HTTPS / rate limiting on Render, Railway, Fly.io, AWS, Nginx
app.set('trust proxy', 1);

// 1. Security Headers Middleware
app.use(securityHeaders);

// 2. Structured Request Logger with Automated Secret Redaction
app.use(requestLogger);

// 3. Dynamic Strict CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser / server-to-server requests (no origin header, e.g. curl, Telegram webhooks)
    if (!origin) return callback(null, true);

    // In development mode, allow localhost dev servers
    if (!config.isProduction) {
      return callback(null, true);
    }

    // In production, strictly match configured origins
    const allowed = config.corsOrigins.includes(origin) || (config.frontendUrl && origin === config.frontendUrl);
    if (allowed) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy blocked request from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token', 'x-workspace-id'],
}));

// Body Parsing
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// 4. Health & Readiness Endpoints (Exempt from strict rate limits)
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

app.get(['/ready', '/api/ready'], async (req, res) => {
  try {
    const isDbReady = typeof (db as any).ping === 'function' ? await (db as any).ping() : true;
    if (!isDbReady) {
      return res.status(503).json({
        status: 'unready',
        database: 'disconnected',
        error: 'Database connection check failed',
      });
    }

    const tenants = await db.getTenants();
    const agents = await db.getAgents();

    res.status(200).json({
      status: 'ready',
      database: 'connected',
      tenantsCount: tenants.length,
      agentsCount: agents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unready',
      error: err.message || 'Database unavailable',
    });
  }
});

// 5. Mount Authentication Routes with Auth Rate Limiting
app.use('/api/auth', authRateLimiter, authRouter);

// 6. Mount Business REST API with API Rate Limiting & Optional Auth Context
app.use('/api', apiRateLimiter, optionalAuth, apiRouter);

// 7. Create HTTP Server & WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket, req) => {
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to TeleAgent real-time SaaS stream' }));

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch {
      // ignore malformed payloads
    }
  });

  ws.on('error', (err) => {
    console.warn('WebSocket client error:', err.message);
  });
});

// Auto-start active polling bots on boot
server.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 TeleAgent SaaS Server running on port ${PORT}`);
  console.log(`📡 REST API: http://localhost:${PORT}/api`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`⚡ WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`🌍 Environment: ${config.nodeEnv} (Production: ${config.isProduction})`);
  console.log(`🛡️ CORS Allowed: ${config.corsOrigins.join(', ')}`);
  console.log(`====================================================`);

  // Start polling for connected agents marked for polling
  try {
    const agents = await db.getAgents();
    const activeAgents = agents.filter(a => a.telegramBot.isConnected && a.telegramBot.usePolling && a.telegramBot.token);
    activeAgents.forEach(a => {
      TelegramBotManager.startPolling(a.id);
    });
  } catch (err: any) {
    console.warn('Could not auto-start polling agents on launch:', err.message);
  }
});

// Graceful Shutdown Handlers
async function handleGracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // 1. Stop all Telegram polling bots
  TelegramBotManager.stopAllPolling();

  // 2. Close WebSocket server & active clients
  wss.clients.forEach(client => {
    try {
      client.close(1001, 'Server shutting down');
    } catch {}
  });
  wss.close(() => {
    console.log('📡 WebSocket server closed.');
  });

  // 3. Close Database pool if available
  if (typeof (db as any).close === 'function') {
    await (db as any).close();
  }

  // 4. Close HTTP Server
  server.close(() => {
    console.log('🏁 HTTP server closed. State flushed to persistence.');
    process.exit(0);
  });

  // Force close if graceful shutdown takes longer than 5 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

export default app;
