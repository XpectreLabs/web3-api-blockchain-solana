const solanaService = require('../services/solanaService');
const logger = require('../utils/logger');

/**
 * GET /api/solana/health
 * Verifica la conectividad con el cluster de Solana.
 */
async function healthCheck(req, res, next) {
  try {
    const info = await solanaService.getClusterInfo();
    res.json({
      success: true,
      data: {
        status: 'connected',
        ...info,
      },
    });
  } catch (error) {
    logger.error('Error en health check de Solana', { error: error.message });
    next(error);
  }
}

/**
 * GET /api/solana/balance/:address
 * Obtiene el balance de una dirección pública.
 */
async function getBalance(req, res, next) {
  try {
    const { address } = req.params;
    const balance = await solanaService.getBalance(address);

    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error('Error al obtener balance', {
      address: req.params.address,
      error: error.message,
    });

    if (error.message.includes('Invalid public key')) {
      error.statusCode = 400;
      error.message = 'Dirección pública inválida';
    }

    next(error);
  }
}



/**
 * GET /api/solana/transactions/:address
 * Obtiene las transacciones recientes de una dirección.
 * Query: ?limit=10
 */
async function getRecentTransactions(req, res, next) {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;
    const transactions = await solanaService.getRecentTransactions(address, limit);

    res.json({
      success: true,
      data: {
        address,
        count: transactions.length,
        transactions,
      },
    });
  } catch (error) {
    logger.error('Error al obtener transacciones recientes', {
      address: req.params.address,
      error: error.message,
    });
    next(error);
  }
}

module.exports = {
  healthCheck,
  getBalance,
  getRecentTransactions,
};
