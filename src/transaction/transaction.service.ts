import { Injectable, Logger } from '@nestjs/common';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaService } from '../solana/solana.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { TransactionType } from '../common/constants/transaction.constants';
import {
  inferTransactionType,
  extractAmountSOL,
  sortTransactions,
  SolanaTransactionResponse,
  SortableTransaction,
} from '../common/utils/transaction.utils';

const MAX_TRANSACTION_LIMIT = 50;
const TYPE_FILTER_FETCH_MULTIPLIER = 3;

export interface TransactionSummary extends SortableTransaction {
  signature: string;
  slot: number;
  blockTime: number | null;
  blockTimeISO: string | null;
  fee: number;
  feeSOL: number;
  status: 'success' | 'failed';
  type: TransactionType;
  amountSOL: number;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private readonly solanaService: SolanaService) {}

  async queryTransactions(params: QueryTransactionsDto) {
    const { wallet, type } = params;
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;
    const sortBy = params.sortBy ?? 'timestamp';
    const sortOrder = params.sortOrder ?? 'desc';

    const conn = this.solanaService.getConnection();
    const publicKey = new PublicKey(wallet);
    const safeLimit = Math.min(Math.max(limit, 1), MAX_TRANSACTION_LIMIT);
    const safeOffset = Math.max(offset, 0);

    const fetchCount = type
      ? Math.min((safeLimit + safeOffset) * TYPE_FILTER_FETCH_MULTIPLIER, 100)
      : safeLimit + safeOffset;

    const signatures = await conn.getSignaturesForAddress(publicKey, {
      limit: fetchCount,
    });

    const signatureList = signatures.map((sig) => sig.signature);
    const rawTxs =
      signatureList.length > 0
        ? ((await conn.getTransactions(signatureList, {
            maxSupportedTransactionVersion: 0,
          })) as unknown as SolanaTransactionResponse[])
        : [];

    const transactions: TransactionSummary[] = [];

    for (let i = 0; i < signatures.length; i++) {
      const raw = rawTxs[i];
      if (!raw) {
        this.logger.warn(
          `Failed to fetch transaction details: ${signatures[i].signature}`,
        );
        continue;
      }

      const typeInferred = inferTransactionType(raw);
      const amountSOL = extractAmountSOL(raw, wallet);
      const fee = raw.meta?.fee ?? 0;

      const summary: TransactionSummary = {
        signature: signatures[i].signature,
        slot: raw.slot ?? 0,
        blockTime: raw.blockTime ?? null,
        blockTimeISO: raw.blockTime
          ? new Date(raw.blockTime * 1000).toISOString()
          : null,
        fee,
        feeSOL: fee / LAMPORTS_PER_SOL,
        status: raw.meta?.err ? 'failed' : 'success',
        type: typeInferred,
        amountSOL,
      };

      if (type && summary.type !== type) {
        continue;
      }

      transactions.push(summary);
    }

    const sorted = sortTransactions(transactions, sortBy, sortOrder);
    const paginated = sorted.slice(safeOffset, safeOffset + safeLimit);

    this.logger.debug(
      `queryTransactions wallet=${wallet} count=${paginated.length} type=${type || 'all'} sortBy=${sortBy} sortOrder=${sortOrder}`,
    );

    return {
      wallet,
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        count: paginated.length,
        totalMatched: sorted.length,
      },
      filters: {
        type: type || null,
        sortBy,
        sortOrder,
      },
      transactions: paginated,
    };
  }
}
