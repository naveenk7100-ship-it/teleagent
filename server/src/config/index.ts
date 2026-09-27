import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  sessionSecret: string;
  encryptionKey: string;
  frontendUrl?: string;
  corsOrigins: string[];
  databaseUrl?: string;
  geminiApiKey?: string;
  telegramWebhookDomain?: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

function validateAndLoadConfig(): ServerConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const port = parseInt(process.env.PORT || '3001', 10);

  const sessionSecret = process.env.SESSION_SECRET || 'teleagent-default-session-secret-key-2026';
  const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'teleagent-default-secure-encryption-key-2026';

  if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'teleagent-default-session-secret-key-2026')) {
    console.warn('⚠️ PRODUCTION WARNING: Running with default SESSION_SECRET. Set a strong secret in .env for production.');
  }

  const frontendUrl = process.env.FRONTEND_URL;

  // Parse allowed CORS origins
  const corsRaw = process.env.CORS_ORIGIN || (isProduction ? '' : 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173');
  const corsOrigins = corsRaw.split(',').map(s => s.trim()).filter(Boolean);

  if (frontendUrl && !corsOrigins.includes(frontendUrl)) {
    corsOrigins.push(frontendUrl);
  }

  const databaseUrl = process.env.DATABASE_URL;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const telegramWebhookDomain = process.env.TELEGRAM_WEBHOOK_DOMAIN;

  const rateLimit = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '300', 10), // 300 requests/min
  };

  return {
    port,
    nodeEnv,
    isProduction,
    sessionSecret,
    encryptionKey,
    frontendUrl,
    corsOrigins,
    databaseUrl,
    geminiApiKey,
    telegramWebhookDomain,
    rateLimit,
  };
}

export const config = validateAndLoadConfig();
