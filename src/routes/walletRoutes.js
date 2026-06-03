const { Router } = require('express');
const { param, query } = require('express-validator');
const validateRequest = require('../middlewares/validateRequest');
const solanaController = require('../controllers/solanaController');

const router = Router();

// ── Health Check de Solana ────────────────────────────────────
// GET /wallet/health
router.get('/health', solanaController.healthCheck);

// ── Balance de wallet ─────────────────────────────────────────
// GET /wallet/:address/balance
router.get(
  '/:address/balance',
  [
    param('address')
      .isString()
      .isLength({ min: 32, max: 44 })
      .withMessage('Dirección pública de Solana inválida (32-44 caracteres Base58)'),
  ],
  validateRequest,
  solanaController.getBalance
);

// ── Transacciones de wallet ───────────────────────────────────
// GET /wallet/:address/transactions
router.get(
  '/:address/transactions',
  [
    param('address')
      .isString()
      .isLength({ min: 32, max: 44 })
      .withMessage('Dirección pública de Solana inválida'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('El límite debe ser un número entre 1 y 50'),
  ],
  validateRequest,
  solanaController.getRecentTransactions
);

module.exports = router;
