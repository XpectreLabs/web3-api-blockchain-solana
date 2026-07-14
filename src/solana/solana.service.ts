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

  private lamportsToSol(lamports: number | bigint): number {
    return Number(lamports) / LAMPORTS_PER_SOL;
  }

  // Balance
  async getBalance(publicKeyStr: string) {
    const publicKey = new PublicKey(publicKeyStr);
    const balanceLamports = await this.connection.getBalance(publicKey);
    return {
      address: publicKeyStr,
      balanceLamports,
      balanceSOL: this.lamportsToSol(balanceLamports),
    };
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
