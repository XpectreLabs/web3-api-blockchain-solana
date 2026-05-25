const { Router } = require('express');

const router = Router();

/**
 * GET /api/health
 *
 * Responde con el estado actual del servidor.
 * Útil para monitoreo, balanceadores de carga y CI/CD.
 *
 * @returns {object} 200 - Estado del servidor
 * @example Respuesta exitosa:
 * {
 *   "status": "ok",
 *   "message": "API is running",
 *   "timestamp": "2026-05-19T16:42:00.000Z",
 *   "version": "1.0.0"
 * }
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

module.exports = router;
