/**
 * @file validateJson.js
 * @description Middleware de validación básica para peticiones.
 *
 *   1. Verifica que las peticiones con body tengan
 *      Content-Type: application/json
 *   2. Verifica que los parámetros de ruta (:param) no estén vacíos
 *
 *   Responde con error 400 si alguna validación falla.
 */

/**
 * Métodos HTTP que normalmente llevan body en la petición.
 */
const METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH'];

/**
 * Valida Content-Type y parámetros de ruta.
 *
 * - Para POST/PUT/PATCH: exige Content-Type application/json
 * - Para todas las peticiones: valida que los parámetros de ruta
 *   no estén vacíos ni contengan solo espacios en blanco
 */
function validateJson(req, res, next) {
  // ── 1. Validar Content-Type en peticiones con body ──────────
  if (METHODS_WITH_BODY.includes(req.method)) {
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: 'Content-Type debe ser application/json',
        },
      });
    }

    // Verificar que el body no esté completamente vacío
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: 'El cuerpo de la peticion no puede estar vacio',
        },
      });
    }
  }

  // ── 2. Validar parámetros de ruta no vacíos ─────────────────
  if (req.params && Object.keys(req.params).length > 0) {
    const emptyParams = [];

    for (const [key, value] of Object.entries(req.params)) {
      if (!value || value.trim() === '') {
        emptyParams.push(key);
      }
    }

    if (emptyParams.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: `Parametros requeridos vacios: ${emptyParams.join(', ')}`,
        },
      });
    }
  }

  next();
}

module.exports = validateJson;
