const path = require('path');

// ── Validación de variables críticas ──────────────────────────
const requiredEnvVars = ['SOLANA_NETWORK'];

/**
 * Valida que las variables de entorno obligatorias estén definidas.
 * Lanza un error si alguna falta para prevenir fallos silenciosos.
 */
function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      ` Variables de entorno faltantes: ${missing.join(', ')}\n` +
      `   Copia .env.example a .env y configura los valores necesarios.`
    );
  }
}

// ── Objeto de configuración ───────────────────────────────────
const config = {
  // Servidor
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    isDev: (process.env.NODE_ENV || 'development') === 'development',
    isProd: process.env.NODE_ENV === 'production',
  },

  // Solana
  solana: {
    network: process.env.SOLANA_NETWORK || 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL || '',
    privateKey: process.env.SOLANA_PRIVATE_KEY || '',
  },

  // Seguridad
  security: {
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
      : ['http://localhost:3000', 'http://localhost:5173'],
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || path.join('logs', 'app.log'),
  },
};

module.exports = { config, validateEnv };
