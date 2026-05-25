/**
 * @file validateRequest.js
 * @description Middleware que ejecuta las validaciones de
 *              express-validator y retorna errores formateados.
 */

const { validationResult } = require('express-validator');

/**
 * Ejecuta las reglas de validación y retorna 400 si hay errores.
 * Se usa como último elemento en el array de validaciones de una ruta.
 *
 * @example
 *   router.post('/wallet',
 *     [body('address').isString().notEmpty()],
 *     validateRequest,
 *     controller.createWallet
 *   );
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Error de validación',
        statusCode: 400,
        details: errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
          value: err.value,
        })),
      },
    });
  }

  next();
}

module.exports = validateRequest;
