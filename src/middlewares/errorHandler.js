const logger = require('../utils/logger');
const { config } = require('../config/config');

// ── Mensajes por defecto según código HTTP ────────────────────
const DEFAULT_MESSAGES = {
  400: 'Solicitud incorrecta',
  401: 'No autorizado',
  403: 'Acceso prohibido',
  404: 'Ruta no encontrada',
  429: 'Demasiadas peticiones',
  500: 'Error interno del servidor',
};

/**
 * Middleware para rutas no encontradas (404).
 * Se coloca DESPUÉS de todas las rutas registradas.
 * Cualquier petición que no coincida con una ruta llega aquí.
 */
function notFoundHandler(req, res, next) {
  const error = new Error('Ruta no encontrada');
  error.statusCode = 404;
  next(error);
}

/**
 * Middleware global de manejo de errores.
 * Se coloca AL FINAL de la cadena de middlewares.
 * Captura cualquier error lanzado o pasado con next(error).
 *
 * @param {Error} err - El error capturado
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {Function} next - Siguiente middleware (requerido por Express)
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Determinar código de estado
  const code = err.statusCode || err.status || 500;

  // Para 500: usar mensaje genérico (no exponer detalles internos)
  // Para otros: usar el mensaje del error o el default del código
  let message;
  if (code === 500) {
    message = DEFAULT_MESSAGES[500];
  } else {
    message = err.message || DEFAULT_MESSAGES[code] || DEFAULT_MESSAGES[500];
  }

  // Registrar el error en logs (con detalles completos)
  logger.error(`${code} - ${err.message || message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    ...(config.server.isDev && { stack: err.stack }),
  });

  // Respuesta JSON estandarizada al cliente
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  // En desarrollo: agregar stack trace para depuración
  if (config.server.isDev && code === 500) {
    response.error.stack = err.stack;
  }

  res.status(code).json(response);
}

module.exports = { notFoundHandler, errorHandler };
