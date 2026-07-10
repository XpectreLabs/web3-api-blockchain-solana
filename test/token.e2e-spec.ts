import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { SolanaService } from './../src/solana/solana.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { NullToNotFoundInterceptor } from '../src/common/interceptors/null-to-not-found.interceptor';
import * as dotenv from 'dotenv';

dotenv.config();

// Valid base58 addresses used as fixtures (no network calls are made).
const KNOWN_MINT = process.env.WRAPPED_SOL_MINT ?? '';
const UNKNOWN_MINT = process.env.TEST_UNKNOWN_MINT ?? '';
const INVALID_MINT = 'not-a-valid-mint';

/** Build a minimal Metaplex metadata account buffer. */
function buildMetadataBuffer(): Buffer {
  const borshString = (value: string, capacity: number): Buffer => {
    const utf8 = Buffer.from(value, 'utf8');
    const body = Buffer.alloc(capacity);
    utf8.copy(body);
    const prefix = Buffer.alloc(4);
    prefix.writeUInt32LE(capacity, 0);
    return Buffer.concat([prefix, body]);
  };
  const pk = new PublicKey(KNOWN_MINT);
  return Buffer.concat([
    Buffer.from([4]),
    pk.toBuffer(), // updateAuthority
    pk.toBuffer(), // mint
    borshString('Wrapped SOL', 32),
    borshString('wSOL', 10),
    borshString('https://example.com/wsol.json', 200),
  ]);
}

describe('TokenController (e2e)', () => {
  let app: INestApplication<App>;

  const mockConnection = {
    getParsedAccountInfo: jest.fn().mockImplementation((pk: PublicKey) => {
      if (pk.toBase58() === KNOWN_MINT) {
        return {
          value: {
            data: {
              program: 'spl-token',
              parsed: {
                type: 'mint',
                info: {
                  decimals: 9,
                  supply: '1000',
                  mintAuthority: KNOWN_MINT,
                  freezeAuthority: null,
                  isInitialized: true,
                },
              },
            },
          },
        };
      }
      return { value: null };
    }),
    getAccountInfo: jest
      .fn()
      .mockResolvedValue({ data: buildMetadataBuffer() }),
    getParsedProgramAccounts: jest.fn().mockResolvedValue([
      {
        pubkey: { toBase58: () => 'TokenAccountB' },
        account: {
          data: {
            parsed: {
              info: {
                owner: 'OwnerB',
                tokenAmount: { amount: '400', uiAmount: 400 },
              },
            },
          },
        },
      },
      {
        pubkey: { toBase58: () => 'TokenAccountA' },
        account: {
          data: {
            parsed: {
              info: {
                owner: 'OwnerA',
                tokenAmount: { amount: '600', uiAmount: 600 },
              },
            },
          },
        },
      },
    ]),
    getSignaturesForAddress: jest.fn().mockResolvedValue([
      {
        signature: 'sigTransfer1',
        slot: 1,
        blockTime: 1700000000,
        err: null,
      },
    ]),
    getParsedTransactions: jest.fn().mockResolvedValue([
      {
        blockTime: 1700000000,
        transaction: {
          message: {
            instructions: [
              {
                program: 'spl-token',
                parsed: {
                  type: 'transferChecked',
                  info: {
                    mint: KNOWN_MINT,
                    tokenAmount: { uiAmount: 5 },
                    source: 'TokenAccountA',
                    destination: 'TokenAccountB',
                    authority: 'OwnerA',
                  },
                },
              },
            ],
          },
        },
        meta: { innerInstructions: [] },
      },
    ]),
  };

  const mockSolanaService = {
    getConnection: () => mockConnection,
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

  afterEach(async () => {
    await app.close();
  });

  describe('GET /tokens/:mint', () => {
    it('returns full metadata + mint info for a valid mint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tokens/${KNOWN_MINT}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.mintAddress).toBe(KNOWN_MINT);
      expect(res.body.data.decimals).toBe(9);
      expect(res.body.data.supply.raw).toBe('1000');
      expect(res.body.data.metadata).toMatchObject({
        name: 'Wrapped SOL',
        symbol: 'wSOL',
        uri: 'https://example.com/wsol.json',
      });
    });

    it('returns 400 for an invalid mint address', () => {
      return request(app.getHttpServer())
        .get(`/tokens/${INVALID_MINT}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.statusCode).toBe(400);
        });
    });

    it('returns 404 for a valid but non-existent mint', () => {
      return request(app.getHttpServer())
        .get(`/tokens/${UNKNOWN_MINT}`)
        .expect(404);
    });
  });

  describe('GET /tokens/:mint/holders', () => {
    it('returns holders ranked by balance descending', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tokens/${KNOWN_MINT}/holders`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.source).toBe('getProgramAccounts');
      const holders = res.body.data.holders;
      expect(holders).toHaveLength(2);
      expect(holders[0].rank).toBe(1);
      expect(holders[0].owner).toBe('OwnerA'); // 600 > 400
      expect(holders[1].owner).toBe('OwnerB');
      expect(holders[0].percentage).toBe('60.0000%');
    });
  });

  describe('GET /tokens/:mint/transfers', () => {
    it('returns transfer history for a valid mint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tokens/${KNOWN_MINT}/transfers`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.mint).toBe(KNOWN_MINT);
      expect(Array.isArray(res.body.data.transfers)).toBe(true);
      expect(res.body.data.transfers[0]).toMatchObject({
        signature: 'sigTransfer1',
        type: 'transferChecked',
        amount: 5,
        source: 'TokenAccountA',
        destination: 'TokenAccountB',
      });
    });

    it('returns 400 when limit is out of range', () => {
      return request(app.getHttpServer())
        .get(`/tokens/${KNOWN_MINT}/transfers?limit=999`)
        .expect(400);
    });
  });
});
