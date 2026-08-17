# Web3 API Blockchain Solana

A REST API for reading Solana on-chain data, built with NestJS and TypeScript by [XpectreLabs](https://xpectrelabs.com).

Wallet balances and analytics, parsed transaction history, and SPL token metadata, holders and transfers — behind JWT auth, tiered rate limiting and PostgreSQL persistence.

---

## What it does

- **Wallet data** — SOL balance, paginated transaction history, and derived analytics for any public address.
- **Transaction parsing** — fetch a transaction by signature and get it back parsed: fees, block time, status, instructions.
- **SPL tokens** — mint metadata (supply, decimals, Metaplex name/symbol), the top holders via `getTokenLargestAccounts`, and transfer history per mint.
- **Auth and quotas** — JWT-issued tokens carrying a tier, enforced by a global guard and a tier-aware throttler.
- **Persistence** — wallet, transaction, token and holder entities in PostgreSQL via TypeORM, with migrations and a seed script.
- **Hardening** — Helmet, configurable CORS, global DTO validation, a global exception filter, and RPC fallback for high-volume token queries.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript |
| Chain | `@solana/web3.js`, `@solana/spl-token`, Metaplex metadata |
| Database | PostgreSQL + TypeORM |
| Auth | `@nestjs/jwt` |
| Rate limiting | `@nestjs/throttler` (tier-aware guard) |
| Security | Helmet, CORS, `ValidationPipe` |

Modular domain-driven layout: `SolanaModule` (RPC connection), `WalletModule`, `TransactionModule`, `TokenModule`, `AuthModule`, `DatabaseModule`.

---

## Endpoints

All endpoints require a `Authorization: Bearer <token>` header except the three marked public.

| Method | Path | What it returns |
|---|---|---|
| `GET` | `/` | Service root — **public** |
| `POST` | `/auth/login` | Issues a JWT for a username and tier — **public** |
| `GET` | `/wallet/health` | Health check — **public** |
| `GET` | `/wallet/:address/balance` | SOL balance for the address |
| `GET` | `/wallet/:address/transactions` | Recent transactions, paginated |
| `GET` | `/wallet/:address/analytics` | Derived activity metrics for the wallet |
| `GET` | `/transactions` | Transaction query with filters and pagination |
| `GET` | `/transactions/:signature` | One transaction, fully parsed |
| `GET` | `/tokens/:mint` | SPL token metadata — supply, decimals, name |
| `GET` | `/tokens/:mint/holders` | Top holders for the mint |
| `GET` | `/tokens/:mint/transfers` | Transfer history for the mint |

Addresses are validated by a custom `SolanaAddressPipe`, so a malformed public key returns `400` rather than reaching the RPC node.

### Rate limits

| Tier | Requests / minute |
|---|---|
| `free` | 100 |
| `pro` | 1000 |

Get a token:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","tier":"free"}'
```

---

## Running it locally

### 1. Install

```bash
npm install
```

### 2. Configure

Create a `.env` in the project root:

```env
# ── Server ───────────────────────────────────────────────
PORT=3000
NODE_ENV=development
# Comma-separated allowed origins; '*' for public access
CORS_ORIGINS=*

# ── Solana ───────────────────────────────────────────────
# devnet | testnet | mainnet-beta
SOLANA_NETWORK=devnet
# Optional. Falls back to the free public endpoint if unset.
# Recommended for production or heavy use (Helius, QuickNode, Alchemy):
# SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY

# ── Database ─────────────────────────────────────────────
# Either a single connection string…
# DATABASE_URL=postgres://user:password@host:5432/dbname
# …or discrete variables:
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=solana_api
```

`DATABASE_URL` takes precedence when set, which is what cloud deploys (Railway and similar) provide.

### 3. Migrate

```bash
npm run migration:run
```

### 4. Run

```bash
npm run start:dev     # watch mode
```

Production:

```bash
npm run build
npm run start:prod
```

---

## Testing

```bash
npm run test          # unit
npm run test:e2e      # end-to-end
```

There is also a [`tests.http`](tests.http) file — open it in VS Code with the REST Client extension and hit **Send Request** against a running local server to exercise every endpoint.

---

## Status

In active development since May 2026 — 59 commits and 26 merged pull requests, built by the team as feature branches under review.

---

## Roadmap

- **Mainnet support** with a Helius RPC configuration template — [`feature/mainnet`](https://github.com/XpectreLabs/web3-api-blockchain-solana/tree/feature/mainnet)
- **Helius-backed holder queries** for high-volume tokens, with a timeout fallback so large mints don't fail the request — [#37](https://github.com/XpectreLabs/web3-api-blockchain-solana/pull/37)
- **End-to-end coverage for auth and rate limiting** — [`feature/US-E7.4-tests-docs`](https://github.com/XpectreLabs/web3-api-blockchain-solana/tree/feature/US-E7.4-tests-docs)
- **OpenAPI / Swagger documentation** served from the API itself

---

## Origin

This project grew out of a [Solana hackathon we ran in Villahermosa, Tabasco](https://github.com/gartox/solana-hackathon-latam) in March 2026 — 9 developers, no prior Solana experience, 4 dApps shipped to Devnet in 4 hours. The materials from that event are open source.
