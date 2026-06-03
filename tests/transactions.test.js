process.env.SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
process.env.NODE_ENV = 'test';

const request = require('supertest');

const mockGetTransactionDetail = jest.fn();
const mockQueryTransactions = jest.fn();

jest.mock('../src/services/solanaService', () => ({
  getTransactionDetail: (...args) => mockGetTransactionDetail(...args),
  queryTransactions: (...args) => mockQueryTransactions(...args),
  getBalance: jest.fn(),
  getTransaction: jest.fn(),
  getClusterInfo: jest.fn(),
  requestAirdrop: jest.fn(),
  getRecentTransactions: jest.fn(),
  connection: jest.fn(),
}));

const app = require('../app');

const VALID_SIGNATURE = '4aguv6rLQm3FTqR3RecYX8ovqXNQK3U5THUuwmkoMdWJR9pHtQSdgvz8trh5ngQhQcTLJApPjuuTBqzaLLySyjaU';
const VALID_WALLET = '6jHGrsG1HAiV7DpWFtzPoAYnSp4fb4t53MSFc5ykjHxu';

const sampleDetail = {
  signature: VALID_SIGNATURE,
  slot: 1,
  blockTime: 1700000000,
  status: 'success',
  accounts: [],
  balanceChanges: [],
};

const sampleList = {
  wallet: VALID_WALLET,
  pagination: { limit: 10, offset: 0, count: 1, totalMatched: 1 },
  filters: { type: null, sortBy: 'timestamp', sortOrder: 'desc' },
  transactions: [
    {
      signature: VALID_SIGNATURE,
      blockTime: 1700000000,
      type: 'transfer',
      amountSOL: 0.05,
      status: 'success',
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /transactions/:signature', () => {
  it('devuelve 200 con detalle completo', async () => {
    mockGetTransactionDetail.mockResolvedValue(sampleDetail);

    const res = await request(app).get(`/transactions/${VALID_SIGNATURE}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.signature).toBe(VALID_SIGNATURE);
    expect(mockGetTransactionDetail).toHaveBeenCalledWith(VALID_SIGNATURE);
  });

  it('devuelve 404 si la transacción no existe', async () => {
    mockGetTransactionDetail.mockResolvedValue(null);

    const res = await request(app).get(`/transactions/${VALID_SIGNATURE}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('devuelve 400 si la firma es inválida', async () => {
    const res = await request(app).get('/transactions/firma-corta');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockGetTransactionDetail).not.toHaveBeenCalled();
  });
});

describe('GET /transactions', () => {
  it('devuelve 200 con listado filtrado por wallet', async () => {
    mockQueryTransactions.mockResolvedValue(sampleList);

    const res = await request(app).get(`/transactions?wallet=${VALID_WALLET}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.wallet).toBe(VALID_WALLET);
    expect(res.body.data.transactions).toHaveLength(1);
    expect(mockQueryTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet: VALID_WALLET,
        limit: 10,
        offset: 0,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      })
    );
  });

  it('pasa filtros de tipo, paginación y ordenamiento', async () => {
    mockQueryTransactions.mockResolvedValue({
      ...sampleList,
      filters: { type: 'transfer', sortBy: 'amount', sortOrder: 'asc' },
    });

    const res = await request(app).get(
      `/transactions?wallet=${VALID_WALLET}&type=transfer&limit=5&offset=2&sortBy=amount&sortOrder=asc`
    );

    expect(res.status).toBe(200);
    expect(mockQueryTransactions).toHaveBeenCalledWith({
      wallet: VALID_WALLET,
      type: 'transfer',
      limit: 5,
      offset: 2,
      sortBy: 'amount',
      sortOrder: 'asc',
    });
  });

  it('devuelve 400 sin wallet', async () => {
    const res = await request(app).get('/transactions');

    expect(res.status).toBe(400);
    expect(mockQueryTransactions).not.toHaveBeenCalled();
  });

  it('devuelve 400 con type inválido', async () => {
    const res = await request(app).get(
      `/transactions?wallet=${VALID_WALLET}&type=swap`
    );

    expect(res.status).toBe(400);
    expect(mockQueryTransactions).not.toHaveBeenCalled();
  });
});
