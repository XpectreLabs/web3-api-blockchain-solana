import { AppDataSource } from './data-source';
import { WalletEntity } from './entities/wallet.entity';
import { TokenEntity } from './entities/token.entity';
import { HolderEntity } from './entities/holder.entity';
import { TransactionEntity } from './entities/transaction.entity';

// Mock addresses for local development seeding only (low-entropy, not real keys)
const MOCK_WALLET_1 = 'MockWallet1Dev' + 'A'.repeat(30);  // 44 chars
const MOCK_WALLET_2 = 'MockWallet2Dev' + 'B'.repeat(30);  // 44 chars
const MOCK_TOKEN_1  = 'MockTokenMint1' + 'C'.repeat(30);  // 44 chars
const MOCK_TOKEN_2  = 'MockTokenMint2' + 'D'.repeat(30);  // 44 chars
const MOCK_AUTHORITY = 'MockMintAuth1' + 'E'.repeat(31); // 44 chars

async function run() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  // Truncate all tables in one raw CASCADE query to avoid foreign key errors
  await AppDataSource.query('TRUNCATE TABLE "holders", "transactions", "tokens", "wallets" CASCADE;');

  console.log('Seeding Wallets...');
  const wallet1 = new WalletEntity();
  wallet1.address = MOCK_WALLET_1;
  wallet1.balanceLamports = '15000000000'; // 15 SOL
  wallet1.tokenCount = 2;
  wallet1.activityScore = 85;
  wallet1.firstSeenDate = '2026-01-01';

  const wallet2 = new WalletEntity();
  wallet2.address = MOCK_WALLET_2;
  wallet2.balanceLamports = '4500000000'; // 4.5 SOL
  wallet2.tokenCount = 1;
  wallet2.activityScore = 40;
  wallet2.firstSeenDate = '2026-03-15';

  await AppDataSource.getRepository(WalletEntity).save([wallet1, wallet2]);

  console.log('Seeding Tokens...');
  const token1 = new TokenEntity();
  token1.mint = MOCK_TOKEN_1;
  token1.symbol = 'USDC';
  token1.name = 'USD Coin';
  token1.uri = 'https://arweave.net/metadata/usdc';
  token1.decimals = 6;
  token1.supplyRaw = '1000000000000000';
  token1.supplyFormatted = 1000000000;
  token1.mintAuthority = MOCK_AUTHORITY;

  const token2 = new TokenEntity();
  token2.mint = MOCK_TOKEN_2;
  token2.symbol = 'USDC_MAIN';
  token2.name = 'USD Coin Mainnet';
  token2.decimals = 6;
  token2.supplyRaw = '5000000000000000';
  token2.supplyFormatted = 5000000000;

  await AppDataSource.getRepository(TokenEntity).save([token1, token2]);

  console.log('Seeding Holders...');
  const holder1 = new HolderEntity();
  holder1.tokenMint = token1.mint;
  holder1.walletAddress = wallet1.address;
  holder1.balance = '5000000000'; // 5000 USDC
  holder1.rank = 1;

  const holder2 = new HolderEntity();
  holder2.tokenMint = token1.mint;
  holder2.walletAddress = wallet2.address;
  holder2.balance = '1200000000'; // 1200 USDC
  holder2.rank = 2;

  await AppDataSource.getRepository(HolderEntity).save([holder1, holder2]);

  console.log('Seeding Transactions...');
  const tx1 = new TransactionEntity();
  tx1.signature = 'mock_sig_1_' + 'A'.repeat(77); // 88 chars total, low entropy
  tx1.walletAddress = wallet1.address;
  tx1.blockTime = '1780000000';
  tx1.slot = '250000000';
  tx1.fee = '5000'; // 5000 lamports
  tx1.rawData = { type: 'transfer', amount: 1000000 };

  const tx2 = new TransactionEntity();
  tx2.signature = 'mock_sig_2_' + 'B'.repeat(77); // 88 chars total, low entropy
  tx2.walletAddress = wallet2.address;
  tx2.blockTime = '1780005000';
  tx2.slot = '250010000';
  tx2.fee = '10000';
  tx2.rawData = { type: 'transfer', amount: 50000 };

  await AppDataSource.getRepository(TransactionEntity).save([tx1, tx2]);

  console.log('Database seeded successfully!');
  await AppDataSource.destroy();
}

run().catch(async (err) => {
  console.error('Error during seeding:', err);
  await AppDataSource.destroy();
});
