import { Injectable, Logger } from '@nestjs/common';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaService } from '../solana/solana.service';

const MAX_TRANSACTION_LIMIT = 50;

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private readonly solanaService: SolanaService) {}

  async queryTransactions(params: {
    wallet: string;
    limit?: number;
    offset?: number;
  }) {
    const { wallet } = params;
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;

    const conn = this.solanaService.getConnection();
    const publicKey = new PublicKey(wallet);
    const safeLimit = Math.min(Math.max(limit, 1), MAX_TRANSACTION_LIMIT);
    const safeOffset = Math.max(offset, 0);

    const fetchCount = safeLimit + safeOffset;

    const signatures = await conn.getSignaturesForAddress(publicKey, {
      limit: fetchCount,
    });

    const signatureList = signatures.map((sig) => sig.signature);
    const rawTxs =
      signatureList.length > 0
        ? await conn.getTransactions(signatureList, {
            maxSupportedTransactionVersion: 0,
          })
        : [];

    const transactions: any[] = [];

    for (let i = 0; i < signatures.length; i++) {
      const raw = rawTxs[i];
      if (!raw) continue;

      const fee = raw.meta?.fee ?? 0;
      transactions.push({
        signature: signatures[i].signature,
        slot: raw.slot,
        blockTime: raw.blockTime,
        blockTimeISO: raw.blockTime
          ? new Date(raw.blockTime * 1000).toISOString()
          : null,
        fee,
        feeSOL: fee / LAMPORTS_PER_SOL,
        status: raw.meta?.err ? 'failed' : 'success',
      });
    }

    const paginated = transactions.slice(safeOffset, safeOffset + safeLimit);

    return {
      wallet,
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        count: paginated.length,
        totalMatched: transactions.length,
      },
      transactions: paginated,
    };
  }
}
