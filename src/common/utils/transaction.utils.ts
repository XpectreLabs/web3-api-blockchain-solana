import { SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TransactionType } from '../constants/transaction';

const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58();
const COMPUTE_BUDGET_PROGRAM_ID = process.env.COMPUTE_BUDGET_PROGRAM_ID;

export interface CompiledInstruction {
  programIdIndex: number;
  accounts?: number[];
  data?: string;
}

export interface SolanaAccountKey {
  toBase58: () => string;
}

export interface TransactionMessage {
  accountKeys: (SolanaAccountKey | string)[];
  compiledInstructions?: CompiledInstruction[];
  instructions?: CompiledInstruction[];
  getAccountKeys?: () => {
    staticAccountKeys: SolanaAccountKey[];
  };
}

export interface VersionedTransaction {
  message: TransactionMessage;
}

export interface TransactionMeta {
  preBalances?: number[];
  postBalances?: number[];
  fee?: number;
  err?: unknown;
}

export interface SortableTransaction {
  blockTime?: number | null;
  amountSOL?: number;
}

export interface SolanaTransactionResponse extends SortableTransaction {
  slot?: number;
  meta?: TransactionMeta | null;
  transaction: VersionedTransaction;
  type?: TransactionType;
}

function getAccountKeys(
  tx: SolanaTransactionResponse,
): (SolanaAccountKey | string)[] {
  if (!tx?.transaction?.message) {
    return [];
  }
  if (tx.transaction.message.getAccountKeys) {
    return tx.transaction.message.getAccountKeys().staticAccountKeys;
  }
  return tx.transaction.message.accountKeys || [];
}

/**
 * Infers transaction type based on the instructions present in the transaction.
 * @param tx The versioned transaction response from Solana RPC
 */
export function inferTransactionType(
  tx: SolanaTransactionResponse,
): TransactionType {
  const accountKeys = getAccountKeys(tx);
  const message = tx?.transaction?.message;
  const instructions =
    message?.compiledInstructions || message?.instructions || [];

  let usesSystemProgram = false;
  let usesOtherProgram = false;

  for (const ix of instructions) {
    const key = accountKeys[ix.programIdIndex];
    if (!key) {
      continue;
    }
    const programId = typeof key === 'string' ? key : key.toBase58();

    if (programId === COMPUTE_BUDGET_PROGRAM_ID) {
      continue;
    }

    if (programId === SYSTEM_PROGRAM_ID) {
      usesSystemProgram = true;
    } else {
      usesOtherProgram = true;
    }
  }

  if (usesSystemProgram && !usesOtherProgram) {
    return TransactionType.TRANSFER;
  }

  return TransactionType.INSTRUCTION;
}

/**
 * Extracts change amount in SOL for the given transaction and wallet address.
 * If no walletAddress is provided, returns the maximum lamport delta across all accounts.
 */
export function extractAmountSOL(
  tx: SolanaTransactionResponse,
  walletAddress?: string,
): number {
  const accountKeys = getAccountKeys(tx).map((key) =>
    typeof key === 'string' ? key : key.toBase58(),
  );

  const preBalances = tx.meta?.preBalances;
  const postBalances = tx.meta?.postBalances;

  if (
    !preBalances ||
    !postBalances ||
    preBalances.length === 0 ||
    postBalances.length === 0
  ) {
    return 0;
  }

  if (walletAddress) {
    const index = accountKeys.indexOf(walletAddress);
    if (
      index >= 0 &&
      index < preBalances.length &&
      index < postBalances.length
    ) {
      const pre = preBalances[index] ?? 0;
      const post = postBalances[index] ?? 0;
      return Math.abs(post - pre) / LAMPORTS_PER_SOL;
    }
    return 0;
  }

  let maxLamports = 0;
  const length = Math.min(preBalances.length, postBalances.length);
  for (let i = 0; i < length; i += 1) {
    const delta = Math.abs((postBalances[i] ?? 0) - (preBalances[i] ?? 0));
    if (delta > maxLamports) {
      maxLamports = delta;
    }
  }

  return maxLamports / LAMPORTS_PER_SOL;
}

/**
 * Sorts array of transactions based on sortBy ('timestamp' or 'amount') and sortOrder ('asc' or 'desc').
 */
export function sortTransactions<T extends SortableTransaction>(
  transactions: T[],
  sortBy: 'timestamp' | 'amount',
  sortOrder: 'asc' | 'desc',
): T[] {
  const direction = sortOrder === 'asc' ? 1 : -1;

  return [...transactions].sort((a, b) => {
    const valueA =
      sortBy === 'amount' ? (a.amountSOL ?? 0) : (a.blockTime ?? 0);
    const valueB =
      sortBy === 'amount' ? (b.amountSOL ?? 0) : (b.blockTime ?? 0);

    if (valueA === valueB) {
      return 0;
    }

    return valueA > valueB ? direction : -direction;
  });
}
