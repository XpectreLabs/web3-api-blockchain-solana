const solanaService = require('../services/solanaService');
const logger = require('../utils/logger');

/**
 * GET /transactions/:signature
 * Obtiene el detalle completo de una transacción por su firma.
 */
async function getTransactionDetail(req, res, next) {
  try {
    const { signature } = req.params;
    const transaction = await solanaService.getTransactionDetail(signature);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Transacción no encontrada',
          statusCode: 404,
        },
      });
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    logger.error('Error al obtener detalle de transacción', {
      signature: req.params.signature,
      error: error.message,
    });
    next(error);
  }
}

/**
 * GET /transactions
 * Lista transacciones con filtrado, paginación y ordenamiento.
 */
async function listTransactions(req, res, next) {
  try {
    const {
      wallet,
      type,
      limit,
      offset,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await solanaService.queryTransactions({
      wallet,
      type,
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
      sortBy: sortBy || 'timestamp',
      sortOrder: sortOrder || 'desc',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error al listar transacciones', {
      wallet: req.query.wallet,
      error: error.message,
    });

    if (error.message.includes('Invalid public key')) {
      error.statusCode = 400;
      error.message = 'Dirección de wallet inválida';
    }

    next(error);
  }
}

module.exports = {
  getTransactionDetail,
  listTransactions,
};
