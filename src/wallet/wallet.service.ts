import { Injectable, Logger } from '@nestjs/common';
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  ParsedAccountData,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SolanaService } from '../solana/solana.service';

/** Single token entry inside the portfolio breakdown. */
export interface PortfolioEntry {
  token: string;
  mint: string;
  balance: number;
  percentage: string;
}

/** Full analytics response shape for GET /wallet/:address/analytics */
export interface WalletAnalytics {
  address: string;
  solBalance: number;
  totalTokens: number;
  portfolioBreakdown: PortfolioEntry[];
}

/** Shape of the `info` blob returned by the parsed SPL token account data. */
interface ParsedTokenAccountInfo {
  mint?: string;
  tokenAmount?: { uiAmount?: number | null; amount?: string };
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly solanaService: SolanaService) {}

  /**
   * Builds a portfolio breakdown for the given wallet address.
   * Fetches native SOL balance and all SPL token accounts, filters out
   * zero-balance entries, then calculates each token's percentage share.
   * All program addresses and RPC credentials are read from environment
   * variables — no sensitive data is hardcoded here.
   */
  async getWalletAnalytics(address: string): Promise<WalletAnalytics | null> {
    const conn = this.solanaService.getConnection();
    const publicKey = new PublicKey(address);

    // Fetch native SOL balance (in lamports, convert to SOL)
    const lamports = await conn.getBalance(publicKey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // Fetch all SPL token accounts owned by this wallet
    let splAccounts: PortfolioEntry[] = [];
    try {
      const response = await conn.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      splAccounts = response.value
        .map((accountInfo) => {
          const data = accountInfo.account.data;
          const info = (data?.parsed?.info ?? {}) as ParsedTokenAccountInfo;
          const balance = info.tokenAmount?.uiAmount ?? 0;
          const mint = info.mint ?? 'Unknown';
          return { token: mint, mint, balance, percentage: '0.00%' };
        })
        .filter((entry) => entry.balance > 0);
    } catch (error) {
      this.logger.warn(
        `Failed to fetch SPL token accounts for ${address}: ${(error as Error).message}`,
      );
    }

    // Build the full list including native SOL as the first entry
    const allEntries: Omit<PortfolioEntry, 'percentage'>[] = [
      { token: 'SOL', mint: 'Native', balance: solBalance },
      ...splAccounts.map((e) => ({
        token: e.token,
        mint: e.mint,
        balance: e.balance,
      })),
    ];

    // Calculate total combined balance to derive percentage shares
    const totalBalance = allEntries.reduce((sum, e) => sum + e.balance, 0);

    const portfolioBreakdown: PortfolioEntry[] = allEntries.map((entry) => ({
      ...entry,
      percentage:
        totalBalance > 0
          ? ((entry.balance / totalBalance) * 100).toFixed(4) + '%'
          : '0.0000%',
    }));

    return {
      address,
      solBalance,
      totalTokens: splAccounts.length,
      portfolioBreakdown,
    };
  }
}
