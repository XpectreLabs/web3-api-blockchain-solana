const { Router } = require('express');
const healthRoutes = require('./healthRoutes');

const router = Router();

// ── Ruta raíz de la API ───────────────────────────────────────
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Solana Blockchain API v1',
    endpoints: {
      health: 'GET /wallet/health',
      balance: 'GET /wallet/:address/balance',
      transactions: 'GET /wallet/:address/transactions',
      transaction: 'GET /wallet/transaction/:signature',
    },
  });
});

// ── Registrar módulos de rutas ────────────────────────────────
router.use('/health', healthRoutes);

module.exports = router;
