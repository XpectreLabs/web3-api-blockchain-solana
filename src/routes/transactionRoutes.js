const { Router } = require('express');
const { param, query } = require('express-validator');
const validateRequest = require('../middlewares/validateRequest');
const transactionController = require('../controllers/transactionController');

const TRANSACTION_TYPES = ['transfer', 'instruction'];

const router = Router();

// GET /transactions
router.get(
  '/',
  [
    query('wallet')
      .isString()
      .isLength({ min: 32, max: 44 })
      .withMessage('El parámetro wallet es obligatorio y debe ser una dirección válida'),
    query('type')
      .optional()
      .isIn(TRANSACTION_TYPES)
      .withMessage(`type debe ser: ${TRANSACTION_TYPES.join(', ')}`),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('limit debe ser un entero entre 1 y 50'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset debe ser un entero mayor o igual a 0'),
    query('sortBy')
      .optional()
      .isIn(['timestamp', 'amount'])
      .withMessage('sortBy debe ser timestamp o amount'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sortOrder debe ser asc o desc'),
  ],
  validateRequest,
  transactionController.listTransactions
);

// GET /transactions/:signature
router.get(
  '/:signature',
  [
    param('signature')
      .isString()
      .isLength({ min: 64 })
      .withMessage('Firma de transacción inválida'),
  ],
  validateRequest,
  transactionController.getTransactionDetail
);

module.exports = router;
