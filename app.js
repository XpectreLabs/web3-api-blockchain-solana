
// ── 1. Cargar variables de entorno (PRIMERO) ──────────────────
require('dotenv').config();

// ── 2. Dependencias ───────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// ── 3. Módulos internos ──────────────────────────────────────
const { config, validateEnv } = require('./src/config/config');
const logger = require('./src/utils/logger');
const routes = require('./src/routes');
const { notFoundHandler, errorHandler } = require('./src/middlewares/errorHandler');
const validateJson = require('./src/middlewares/validateJson');

// ── 4. Validar entorno ────────────────────────────────────────
validateEnv();

// ── 5. Crear aplicación Express ───────────────────────────────
const app = express();

// ── 6. Middlewares de seguridad ───────────────────────────────
// Helmet: protege headers HTTP
app.use(helmet());

// CORS: configura orígenes permitidos
app.use(cors({
  origin: config.security.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate Limiting: previene abuso de la API
const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Demasiadas peticiones. Intenta de nuevo mas tarde.',
    },
  },
});
app.use(limiter);

// ── 7. Middlewares de parsing ─────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── 8. Middleware de validacion basica ─────────────────────────
// Valida Content-Type y parametros no vacios (DESPUES del parsing)
app.use(validateJson);

// ── 9. Logging HTTP con Morgan ────────────────────────────────
// En desarrollo: formato detallado con colores
// En produccion: formato combinado redirigido a Winston
if (config.server.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

// ── 10. Ruta de estado general ────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Solana Blockchain API - Funcionando correctamente',
    version: '1.0.0',
    environment: config.server.env,
    timestamp: new Date().toISOString(),
  });
});

// ── 11. Montar rutas de la API ────────────────────────────────
app.use('/api', routes);

// ── 11b. Rutas de wallet (según requerimientos de tarea) ──────
const walletRoutes = require('./src/routes/walletRoutes');
app.use('/wallet', walletRoutes);

// ── 12. Manejo de errores (SIEMPRE al final) ──────────────────
// 12a. Captura rutas no encontradas -> 404
app.use(notFoundHandler);
// 12b. Captura CUALQUIER error -> JSON estandarizado
app.use(errorHandler);

// ── 13. Iniciar servidor ──────────────────────────────────────
const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info('============================================');
  logger.info(`Servidor iniciado en puerto ${PORT}`);
 
});

// ── 14. Manejo de errores no capturados ───────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason: reason?.message || reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = app;


