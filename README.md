# Solana Blockchain API (NestJS)

A robust, enterprise-grade REST API built with NestJS to interact with the Solana blockchain. This project provides endpoints to check wallet balances, fetch transaction histories, parse specific transaction details, and retrieve SPL Token metadata and top holders.

##  Features
- **Wallet Endpoints:** Get SOL balances and recent transactions for any public address.
- **Transaction Details:** Fetch and parse complete transaction information (fees, block times, status).
- **SPL Token Integration:** Fetch Token metadata (supply, decimals) and query the top 20 holders using `getTokenLargestAccounts`.
- **In-Memory Caching:** Prevents RPC rate limiting for heavy requests (like Token Holders).
- **Security & Reliability:** Implements Helmet, CORS, DTO validation, and Throttler (rate limiting).

## Architecture
Built on **NestJS** (TypeScript) implementing a modular domain-driven architecture:
- `SolanaModule`: Core blockchain connection handling.
- `WalletModule`: Endpoints handling wallet states.
- `TransactionModule`: Detailed transaction queries and pagination.
- `TokenModule`: SPL Token functionality.

##  Environment Variables Setup
To run this project, you must create a `.env` file in the root directory. Below is the explanation of all required and optional environment variables:

```env
# ── Server Configuration ─────────────────────────────────────
# The port where the API will run (default: 3000)
PORT=3000

# Defines the environment (development, production, test)
NODE_ENV=development

# Comma-separated list of allowed origins for Cross-Origin Resource Sharing
# Use '*' for public access, or 'http://localhost:5173' for frontend dev
CORS_ORIGINS=*

# ── Solana Configuration ─────────────────────────────────────
# Target Solana network: 'devnet', 'testnet', or 'mainnet-beta'
SOLANA_NETWORK=devnet

# (OPTIONAL BUT RECOMMENDED) Custom RPC Node URL
# If left empty, the API uses the free public endpoint (api.devnet.solana.com).
# For production or heavy usage, input a Helius, QuickNode, or Alchemy API Key URL here:
# SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

##  Installation & Running

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Server (Watch Mode):**
   ```bash
   npm run start:dev
   ```

3. **Build & Run Production:**
   ```bash
   npm run build
   npm run start:prod
   ```

##  Testing the Endpoints
You can easily test all endpoints using the included `tests.http` file.
Simply open `tests.http` in VS Code (with the REST Client extension installed) and click on **"Send Request"** to interact with the active local server.

