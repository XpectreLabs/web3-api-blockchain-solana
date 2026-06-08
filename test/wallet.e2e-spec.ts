import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { SolanaService } from './../src/solana/solana.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { NullToNotFoundInterceptor } from '../src/common/interceptors/null-to-not-found.interceptor';

describe('WalletController (e2e)', () => {
  let app: INestApplication<App>;
  const testWallet = '7wgr184vtmpXpXLoijuvNGznpSsdFUguRQKtxV6eMAJt';

  const mockSolanaService = {
    getClusterInfo: jest.fn().mockResolvedValue({
      status: 'connected',
      network: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
    }),
    getBalance: jest.fn().mockResolvedValue({
      address: testWallet,
      balanceLamports: 1000000000,
      balanceSOL: 1.0,
    }),
    getRecentTransactions: jest.fn().mockResolvedValue([
      {
        signature: 'mockSignature1',
        slot: 12345,
        blockTime: 1625000000,
        status: 'success',
        memo: null,
      },
      {
        signature: 'mockSignature2',
        slot: 12346,
        blockTime: 1625000010,
        status: 'success',
        memo: null,
      },
    ]),
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

  it('/wallet/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/wallet/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('connected');
        expect(res.body.data.network).toBeDefined();
        expect(res.body.data.rpcUrl).toBeDefined();
      });
  });

  it('/wallet/:address/balance (GET)', () => {
    return request(app.getHttpServer())
      .get(`/wallet/${testWallet}/balance`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.address).toBe(testWallet);
        expect(typeof res.body.data.balanceSOL).toBe('number');
        expect(typeof res.body.data.balanceLamports).toBe('number');
      });
  });

  it('/wallet/:address/transactions (GET)', () => {
    return request(app.getHttpServer())
      .get(`/wallet/${testWallet}/transactions?limit=2`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.address).toBe(testWallet);
        expect(Array.isArray(res.body.data.transactions)).toBe(true);
        expect(res.body.data.transactions.length).toBeLessThanOrEqual(2);
      });
  });

  it('/wallet/:address/balance (GET) - invalid address length', () => {
    return request(app.getHttpServer())
      .get('/wallet/invalidAddressShort/balance')
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.statusCode).toBe(400);
        expect(res.body.message).toBeDefined();
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
