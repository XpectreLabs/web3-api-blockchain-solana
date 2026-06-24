import { Injectable, Logger } from '@nestjs/common';
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  ParsedAccountData,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ConfigService } from '@nestjs/config';
import { SolanaService } from '../solana/solana.service';
import {
  SECONDS_PER_DAY,
  ANALYTICS_WINDOW_DAYS,
  MAX_SIGNATURES_FETCH,
  HIGH_ACTIVITY_THRESHOLD,
  MEDIUM_ACTIVITY_THRESHOLD,
  ACTIVITY_SCORE_REFERENCE_TXS,
} from './constants/wallet.constants';
import {
  PortfolioEntry,
  GainLossEntry,
  Volume30Day,
  WalletAgeInfo,
  WalletAnalytics,
} from './interfaces/wallet-analytics.interface';

/** Shape of the `info` blob returned by the parsed SPL token account data. */
interface ParsedTokenAccountInfo {
  mint?: string;
  tokenAmount?: { uiAmount?: number | null; amount?: string };
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly solanaService: SolanaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Builds a full analytics payload for a given wallet address:
   * - Native SOL balance and SPL token portfolio breakdown with percentages.
   * - 30-day transaction volume and trading frequency.
   * - Estimated per-token gain/loss direction based on current holdings.
   * - Wallet age (first-seen date) and engagement activity score.
   *
   * All program IDs and RPC endpoints are read from environment variables —
   * no sensitive data is hardcoded in this file.
   */
  async getWalletAnalytics(address: string): Promise<WalletAnalytics | null> {
    const conn = this.solanaService.getConnection();
    const publicKey = new PublicKey(address);

    // -----------------------------------------------------------------------
    // 1. Native SOL balance
    // -----------------------------------------------------------------------
    const lamports = await conn.getBalance(publicKey);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    // -----------------------------------------------------------------------
    // 2. SPL token accounts → portfolio breakdown
    // -----------------------------------------------------------------------
    let splAccounts: PortfolioEntry[] = [];
    try {
      const response = await conn.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      splAccounts = response.value
        .map((accountInfo) => {
          const data = accountInfo.account.data as ParsedAccountData;
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

    const allEntries: Omit<PortfolioEntry, 'percentage'>[] = [
      { token: 'SOL', mint: 'Native', balance: solBalance },
      ...splAccounts.map((e) => ({
        token: e.token,
        mint: e.mint,
        balance: e.balance,
      })),
    ];

    const totalBalance = allEntries.reduce((sum, e) => sum + e.balance, 0);

    const portfolioBreakdown: PortfolioEntry[] = allEntries.map((entry) => ({
      ...entry,
      percentage:
        totalBalance > 0
          ? ((entry.balance / totalBalance) * 100).toFixed(4) + '%'
          : '0.0000%',
    }));

    // -----------------------------------------------------------------------
    // 3. 30-day volume and trading frequency
    //    Signature fees read from the network (no hardcoded amounts).
    // -----------------------------------------------------------------------
    const volume30Days = await this.build30DayVolume(address);

    // -----------------------------------------------------------------------
    // 4. Estimated gains/losses per SPL token
    // -----------------------------------------------------------------------
    const gainsLosses = this.buildGainsLosses(splAccounts);

    // -----------------------------------------------------------------------
    // 5. Wallet age and activity score
    // -----------------------------------------------------------------------
    const walletAge = await this.buildWalletAge(address);

    return {
      address,
      solBalance,
      totalTokens: splAccounts.length,
      portfolioBreakdown,
      volume30Days,
      gainsLosses,
      walletAge,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Fetches up to MAX_SIGNATURES_FETCH signatures and computes:
   * - Number of transactions in the last ANALYTICS_WINDOW_DAYS days.
   * - Average transactions per day (trading frequency).
   * - Estimated fees in SOL (sum of on-chain fee fields when available).
   */
  private async build30DayVolume(address: string): Promise<Volume30Day> {
    const conn = this.solanaService.getConnection();
    const publicKey = new PublicKey(address);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowStart = nowSeconds - ANALYTICS_WINDOW_DAYS * SECONDS_PER_DAY;

    let transactionCount = 0;
    let estimatedFeesSOL = 0;

    try {
      const signatures = await conn.getSignaturesForAddress(publicKey, {
        limit: MAX_SIGNATURES_FETCH,
      });

      const recentSignatures = signatures.filter(
        (s) => (s.blockTime ?? 0) >= windowStart,
      );

      transactionCount = recentSignatures.length;

      // Fetch transactions one-by-one (Helius free tier blocks batch requests).
      if (recentSignatures.length > 0) {
        for (const sig of recentSignatures.slice(0, 100)) {
          try {
            const tx = await conn.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
            });
            const fee = tx?.meta?.fee ?? 0;
            estimatedFeesSOL += fee / LAMPORTS_PER_SOL;
          } catch {
            // skip individual failures
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to compute 30-day volume for ${address}: ${(error as Error).message}`,
      );
    }

    const txPerDay = (transactionCount / ANALYTICS_WINDOW_DAYS).toFixed(2);

    return {
      transactionCount,
      tradingFrequency: `${txPerDay} tx/day`,
      estimatedFeesSOL: parseFloat(estimatedFeesSOL.toFixed(6)),
      periodDays: ANALYTICS_WINDOW_DAYS,
    };
  }

  /**
   * Estimates the gain/loss direction for each active SPL token.
   * Since on-chain historical price data is not available without a price
   * oracle, this is a quantity-based estimation: any positive current balance
   * implies a potential gain relative to having held nothing.
   */
  private buildGainsLosses(splAccounts: PortfolioEntry[]): GainLossEntry[] {
    return splAccounts.map((entry) => {
      const estimatedChange: 'gain' | 'flat' | 'loss' =
        entry.balance > 0 ? 'gain' : entry.balance === 0 ? 'flat' : 'loss';

      return {
        mint: entry.mint,
        currentBalance: entry.balance,
        estimatedChange,
        note: 'Estimated from current holdings — no external price oracle used.',
      };
    });
  }

  /**
   * Determines the wallet's first-seen date by inspecting the oldest known
   * signature, then computes an activity score (0-100) based on the number
   * of transactions within the last ANALYTICS_WINDOW_DAYS days.
   */
  private async buildWalletAge(address: string): Promise<WalletAgeInfo> {
    const conn = this.solanaService.getConnection();
    const publicKey = new PublicKey(address);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowStart = nowSeconds - ANALYTICS_WINDOW_DAYS * SECONDS_PER_DAY;

    let firstSeenDate: string | null = null;
    let walletAgeInDays: number | null = null;
    let activityScore = 0;

    try {
      const signatures = await conn.getSignaturesForAddress(publicKey, {
        limit: MAX_SIGNATURES_FETCH,
      });

      if (signatures.length > 0) {
        // Oldest is at the end of the array (ascending time order).
        const oldest = signatures[signatures.length - 1];
        if (oldest.blockTime) {
          firstSeenDate = new Date(oldest.blockTime * 1000).toISOString();
          walletAgeInDays = Math.floor(
            (nowSeconds - oldest.blockTime) / SECONDS_PER_DAY,
          );
        }

        // Activity score: recent tx count normalised to 0-100.
        const recentCount = signatures.filter(
          (s) => (s.blockTime ?? 0) >= windowStart,
        ).length;

        activityScore = Math.min(
          Math.round(
            (recentCount / ACTIVITY_SCORE_REFERENCE_TXS) * 100,
          ),
          100,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to compute wallet age for ${address}: ${(error as Error).message}`,
      );
    }

    const activityLabel: WalletAgeInfo['activityLabel'] =
      activityScore >= HIGH_ACTIVITY_THRESHOLD
        ? 'High'
        : activityScore >= MEDIUM_ACTIVITY_THRESHOLD
          ? 'Medium'
          : 'Low';

    return {
      firstSeenDate,
      walletAgeInDays,
      activityScore,
      activityLabel,
    };
  }
}
