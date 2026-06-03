/**
 * @file logger.js
 * @description Configuración de Winston para logging estructurado.
 *              Registra en consola (con colores) y en archivo rotado.
 */

const winston = require('winston');
const path = require('path');
const { config } = require('../config/config');

// ── Formato personalizado ─────────────────────────────────────
const customFormat = winston.format.printf(
  ({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`;
  }
);

// ── Instancia del logger ──────────────────────────────────────
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    customFormat
  ),
  defaultMeta: { service: 'solana-api' },
  transports: [
    // Consola con colores
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
    // Archivo de logs
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
    }),
    // Archivo separado solo para errores
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

module.exports = logger;
