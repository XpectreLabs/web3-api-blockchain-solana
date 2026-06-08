import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { SolanaService } from './../src/solana/solana.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { NullToNotFoundInterceptor } from '../src/common/interceptors/null-to-not-found.interceptor';
import * as dotenv from 'dotenv';

dotenv.config();

describe('TransactionController (e2e)', () => {
  let app: INestApplication<App>;
  const testWallet = process.env.TEST_WALLET_ADDRESS;

  if (!testWallet) {
    throw new Error('TEST_WALLET_ADDRESS is not defined in environment variables');
  }

  const sig1 = 'mockSignature11111111111111111111111111111111111111111111111111111';
  const sig2 = 'mockSignature22222222222222222222222222222222222222222222222222222';

  const mockConnection = {
    getSignaturesForAddress: jest.fn().mockResolvedValue([
      { signature: sig1, slot: 12345, blockTime: 1625000000, err: null },
      { signature: sig2, slot: 12346, blockTime: 1625000010, err: null },
    ]),
    getTransactions: jest.fn().mockResolvedValue([
      {
        slot: 12345,
        blockTime: 1625000000,
        meta: { fee: 5000, err: null, preBalances: [1000000000], postBalances: [999995000] },
        transaction: {
          message: {
            getAccountKeys: () => ({
              staticAccountKeys: [{ toBase58: () => testWallet }],
            }),
            instructions: [
              {
                programIdIndex: 0,
                accounts: [0],
              },
            ],
          },
        },
      },
      {
        slot: 12346,
        blockTime: 1625000010,
        meta: { fee: 5000, err: null, preBalances: [1000000000], postBalances: [999995000] },
        transaction: {
          message: {
            getAccountKeys: () => ({
              staticAccountKeys: [{ toBase58: () => testWallet }],
            }),
            instructions: [
              {
                programIdIndex: 0,
                accounts: [0],
              },
            ],
          },
        },
      },
    ]),
  };

  const mockSolanaService = {
    getConnection: () => mockConnection,
    getTransactionDetail: jest.fn().mockImplementation((sig) => {
      if (sig === '5oG4k6aJ4DYZJq1x5M5eX7d6Y5F2e9b8Z3c1A4f5E6d7a1b2c3d4e5f6g7h8i9j0') {
        return null;
      }
      return {
        signature: sig,
        slot: 12345,
        blockTime: 1625000000,
        blockTimeISO: '2021-06-30T00:00:00.000Z',
        fee: 5000,
        feeSOL: 0.000005,
        status: 'success',
        accounts: [testWallet],
        instructions: [
          {
            index: 0,
            programIdIndex: 0,
            accounts: [0],
            dataLength: 0,
          },
        ],
        balanceChanges: [],
        meta: {
          err: null,
          logMessages: [],
          innerInstructions: [],
          computeUnitsConsumed: null,
        },
      };
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SolanaService)
      .useValue(mockSolanaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new NullToNotFoundInterceptor());
    await app.init();
  });

  it('/transactions (GET) - query parameter validation missing wallet', () => {
    return request(app.getHttpServer())
      .get('/transactions')
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.statusCode).toBe(400);
        expect(res.body.message).toBeDefined();
      });
  });

  it('/transactions (GET) - query validation invalid limit', () => {
    return request(app.getHttpServer())
      .get(`/transactions?wallet=${testWallet}&limit=100`)
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.statusCode).toBe(400);
      });
  });

  it('/transactions (GET) - check transactions with sorting and pagination', async () => {
    const response = await request(app.getHttpServer())
      .get(`/transactions?wallet=${testWallet}&limit=2&offset=0&sortBy=timestamp&sortOrder=desc`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.wallet).toBe(testWallet);
    expect(Array.isArray(response.body.data.transactions)).toBe(true);
    expect(response.body.data.pagination.limit).toBe(2);

    const txs = response.body.data.transactions;
    if (txs.length > 1) {
      const t1 = txs[0].blockTime ?? 0;
      const t2 = txs[1].blockTime ?? 0;
      expect(t1).toBeGreaterThanOrEqual(t2);
    }
  });

  it('/transactions (GET) - filter by type transfer', async () => {
    const response = await request(app.getHttpServer())
      .get(`/transactions?wallet=${testWallet}&limit=2&type=transfer`)
      .expect(200);

    expect(response.body.success).toBe(true);
    const txs = response.body.data.transactions;
    txs.forEach((tx: any) => {
      expect(tx.type).toBe('transfer');
    });
  });

  it('/transactions (GET) - sort by amount', async () => {
    const response = await request(app.getHttpServer())
      .get(`/transactions?wallet=${testWallet}&limit=2&sortBy=amount&sortOrder=asc`)
      .expect(200);

    expect(response.body.success).toBe(true);
    const txs = response.body.data.transactions;
    if (txs.length > 1) {
      const a1 = txs[0].amountSOL ?? 0;
      const a2 = txs[1].amountSOL ?? 0;
      expect(a1).toBeLessThanOrEqual(a2);
    }
  });

  it('/transactions/:signature (GET) - detail query and 404 validation', async () => {
    const listResponse = await request(app.getHttpServer())
      .get(`/transactions?wallet=${testWallet}&limit=1`)
      .expect(200);

    const txs = listResponse.body.data.transactions;
    if (txs.length > 0) {
      const signature = txs[0].signature;

      const detailResponse = await request(app.getHttpServer())
        .get(`/transactions/${signature}`)
        .expect(200);

      expect(detailResponse.body.success).toBe(true);
      expect(detailResponse.body.data.signature).toBe(signature);
      expect(detailResponse.body.data.slot).toBeDefined();
      expect(Array.isArray(detailResponse.body.data.accounts)).toBe(true);
      expect(Array.isArray(detailResponse.body.data.instructions)).toBe(true);
    }

    await request(app.getHttpServer())
      .get('/transactions/invalidSigShort')
      .expect(400);

    const nonExistentSig = '5oG4k6aJ4DYZJq1x5M5eX7d6Y5F2e9b8Z3c1A4f5E6d7a1b2c3d4e5f6g7h8i9j0';
    await request(app.getHttpServer())
      .get(`/transactions/${nonExistentSig}`)
      .expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
