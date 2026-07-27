import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

@Injectable()
export class SolanaService implements OnModuleInit {
  private readonly logger = new Logger(SolanaService.name);
  private connection!: Connection;
  private network!: string;
  private rpcUrl!: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.network = this.configService.get<string>('SOLANA_NETWORK', 'devnet');
    this.rpcUrl =
      this.configService.get<string>('SOLANA_RPC_URL') ||
      clusterApiUrl(this.network as any);
    this.connection = new Connection(this.rpcUrl, 'confirmed');
    this.logger.log(`Connected to Solana: ${this.network}`);
  }

  getConnection(): Connection {
    return this.connection;
  }

  /** Safely converts lamports (number | bigint | string | null | undefined) to SOL. */
  private lamportsToSol(lamports: number | bigint | string | null | undefined): number {
    const n = Number(lamports ?? 0);
    return isFinite(n) ? n / LAMPORTS_PER_SOL : 0;
  }

  // In-memory balance cache with 30s TTL
  private balanceCache = new Map<string, { lamports: number; sol: number; cachedAt: number }>();
  private readonly BALANCE_CACHE_TTL_MS = 30_000;

  // Balance — with RPC failure cache fallback
  async getBalance(publicKeyStr: string) {
    try {
      const publicKey = new PublicKey(publicKeyStr);
      const balanceLamports = await this.connection.getBalance(publicKey);
      const balanceSOL = this.lamportsToSol(balanceLamports);

      // Store successful result in cache
      this.balanceCache.set(publicKeyStr, { lamports: balanceLamports, sol: balanceSOL, cachedAt: Date.now() });

      return { address: publicKeyStr, balanceLamports, balanceSOL };
    } catch (error) {
      this.logger.warn(`RPC getBalance failed for ${publicKeyStr}: ${error.message}. Attempting cached fallback.`);

      const cached = this.balanceCache.get(publicKeyStr);
      if (cached && Date.now() - cached.cachedAt < this.BALANCE_CACHE_TTL_MS) {
        this.logger.log(`Returning cached balance for ${publicKeyStr}`);
        return { address: publicKeyStr, balanceLamports: cached.lamports, balanceSOL: cached.sol, cached: true };
      }

      this.logger.error(`No cache available for ${publicKeyStr}. Returning safe zero balance.`);
      return { address: publicKeyStr, balanceLamports: 0, balanceSOL: 0, cached: false };
    }
  }

  // Cluster info
  async getClusterInfo() {
    const [version, epochInfo, supply] = await Promise.all([
      this.connection.getVersion(),
      this.connection.getEpochInfo(),
      this.connection.getSupply(),
    ]);

    return {
      network: this.network,
      rpcUrl: this.rpcUrl,
      version,
      epoch: {
        epoch: epochInfo.epoch,
        slotIndex: epochInfo.slotIndex,
        slotsInEpoch: epochInfo.slotsInEpoch,
        absoluteSlot: epochInfo.absoluteSlot,
      },
      supply: {
        totalSOL: this.lamportsToSol(supply.value.total),
        circulatingSOL: this.lamportsToSol(supply.value.circulating),
      },
    };
  }

  // Recent transactions
  async getRecentTransactions(publicKeyStr: string, limit = 10) {
    const publicKey = new PublicKey(publicKeyStr);
    const signatures = await this.connection.getSignaturesForAddress(
      publicKey,
      { limit },
    );

    return signatures.map((sig) => ({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime,
      status: sig.err ? 'failed' : 'success',
      memo: sig.memo,
    }));
  }

  // Transaction detail
  async getTransactionDetail(signature: string) {
    try {
      const tx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) return null;

      const accountKeys = this.getAccountKeysBase58(tx);
      const fee = tx.meta?.fee ?? 0;

      return {
        signature,
        slot: tx.slot,
        blockTime: tx.blockTime,
        blockTimeISO: tx.blockTime
          ? new Date(tx.blockTime * 1000).toISOString()
          : null,
        fee,
        feeSOL: this.lamportsToSol(fee),
        status: tx.meta?.err ? 'failed' : 'success',
        accounts: accountKeys,
      };
    } catch (error) {
      this.logger.error(`Error in getTransactionDetail: ${error.message}`);
      return null;
    }
  }

  private getAccountKeysBase58(tx: any): string[] {
    if (tx.transaction.message.getAccountKeys) {
      return tx.transaction.message
        .getAccountKeys()
        .staticAccountKeys.map((key: any) => key.toBase58());
    }
    return tx.transaction.message.accountKeys.map((key: any) => key.toBase58());
  }
}
