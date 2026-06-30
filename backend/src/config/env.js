import dotenv from 'dotenv';
dotenv.config();

const num = (v, d) => (v === undefined ? d : Number(v));

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 4000),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: num(process.env.DB_PORT, 3306),
    database: process.env.DB_NAME || 'tnipr',
    user: process.env.DB_USER || 'tnipr',
    password: process.env.DB_PASSWORD || 'tnipr',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_insecure_secret_change_me',
    accessTtl: num(process.env.JWT_ACCESS_TTL, 900),
    refreshTtl: num(process.env.JWT_REFRESH_TTL, 604800),
  },

  logLevel: process.env.LOG_LEVEL || 'info',
  uploadMaxMb: num(process.env.UPLOAD_MAX_MB, 100),

  ai: {
    provider: process.env.AI_PROVIDER || 'heuristic', // 'heuristic' | 'anthropic'
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
  },

  seedAdmin: {
    email: process.env.ADMIN_EMAIL || 'admin@tnipr.gov',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    name: process.env.ADMIN_NAME || 'Regulator Admin',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'TNIP-R Reports <reports@tnipr.gov>',
  },
};
