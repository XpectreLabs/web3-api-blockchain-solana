import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('Authentication & Rate Limiting (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should generate a JWT token for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser', tier: 'free' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
    });

    it('should fall back to free tier if tier is not provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      const decoded = jwtService.decode(res.body.access_token) as any;
      expect(decoded.tier).toBe('free');
    });

    it('should fail validation if username is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ tier: 'pro' })
        .expect(400);
    });

    it('should fail validation if tier is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser', tier: 'invalid-tier' })
        .expect(400);
    });
  });

  describe('Endpoint Guard Protection', () => {
    it('/wallet/health (GET) is public and should not require authentication', async () => {
      const res = await request(app.getHttpServer())
        .get('/wallet/health')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('/wallet/:address/balance (GET) is private and should deny access without token', async () => {
      await request(app.getHttpServer())
        .get('/wallet/7wgr184vtmpXpXLoijuvNGznpSsdFUguRQKtxV6eMAJt/balance')
        .expect(401);
    });

    it('/wallet/:address/balance (GET) should deny access with an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/wallet/7wgr184vtmpXpXLoijuvNGznpSsdFUguRQKtxV6eMAJt/balance')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid token');
        });
    });

    it('/wallet/:address/balance (GET) should deny access with an expired token', async () => {
      // Create a token that is already expired
      const expiredToken = await jwtService.signAsync(
        { username: 'expireduser', tier: 'free' },
        { expiresIn: '-5s' },
      );

      await request(app.getHttpServer())
        .get('/wallet/7wgr184vtmpXpXLoijuvNGznpSsdFUguRQKtxV6eMAJt/balance')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Token expired');
        });
    });

    it('/wallet/:address/balance (GET) should allow access with a valid token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'validuser', tier: 'free' });

      const token = loginRes.body.access_token;

      await request(app.getHttpServer())
        .get('/wallet/7wgr184vtmpXpXLoijuvNGznpSsdFUguRQKtxV6eMAJt/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Tier-Based Rate Limiting', () => {
    it('should set X-RateLimit-Limit to 100 for FREE tier', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'freeuser', tier: 'free' });

      const token = loginRes.body.access_token;

      const res = await request(app.getHttpServer())
        .get('/wallet/7wgr184vtmpXpXLoijuvNGznpSsdFUguRQKtxV6eMAJt/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.headers).toHaveProperty('x-ratelimit-limit');
      expect(res.headers['x-ratelimit-limit']).toBe('100');
    });

    it('should set X-RateLimit-Limit to 1000 for PRO tier', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'prouser', tier: 'pro' });

      const token = loginRes.body.access_token;

      const res = await request(app.getHttpServer())
        .get('/wallet/7wgr184vtmpXpXLoijuvNGznpSsdFUguRQKtxV6eMAJt/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.headers).toHaveProperty('x-ratelimit-limit');
      expect(res.headers['x-ratelimit-limit']).toBe('1000');
    });
  });
});
