import { SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58();
const COMPUTE_BUDGET_PROGRAM_ID = 'ComputeBudget111111111111111111111111111111';

export const TRANSACTION_TYPES = ['transfer', 'instruction'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

function getAccountKeys(tx: any): any[] {
  if (tx.transaction.message.getAccountKeys) {
    return tx.transaction.message.getAccountKeys().staticAccountKeys;
  }
  return tx.transaction.message.accountKeys;
}

/**
 * Infers transaction type based on the instructions present in the transaction.
 * @param tx The versioned transaction response from Solana RPC
 */
export function inferTransactionType(tx: any): TransactionType {
  const accountKeys = getAccountKeys(tx);
  const instructions =
    tx.transaction.message.compiledInstructions ||
    tx.transaction.message.instructions ||
    [];

  let usesSystemProgram = false;
  let usesOtherProgram = false;

  for (const ix of instructions) {
    const programId = accountKeys[ix.programIdIndex]?.toBase58();

    if (!programId || programId === COMPUTE_BUDGET_PROGRAM_ID) {
      continue;
    }

    if (programId === SYSTEM_PROGRAM_ID) {
      usesSystemProgram = true;
    } else {
      usesOtherProgram = true;
    }
  }

  if (usesSystemProgram && !usesOtherProgram) {
    return 'transfer';
  }

  return 'instruction';
}

/**
 * Extracts change amount in SOL for the given transaction and wallet address.
 * If no walletAddress is provided, returns the maximum lamport delta across all accounts.
 */
export function extractAmountSOL(tx: any, walletAddress?: string): number {
  const accountKeys = getAccountKeys(tx).map((key: any) => key.toBase58());

  if (walletAddress) {
    const index = accountKeys.indexOf(walletAddress);
    if (index >= 0) {
      const pre = tx.meta?.preBalances?.[index] ?? 0;
      const post = tx.meta?.postBalances?.[index] ?? 0;
      return Math.abs(post - pre) / LAMPORTS_PER_SOL;
    }
  }

  let maxLamports = 0;
  for (let i = 0; i < (tx.meta?.preBalances?.length ?? 0); i += 1) {
    const delta = Math.abs(
      (tx.meta.postBalances[i] ?? 0) - (tx.meta.preBalances[i] ?? 0),
    );
    if (delta > maxLamports) {
      maxLamports = delta;
    }
  }

  return maxLamports / LAMPORTS_PER_SOL;
}

/**
 * Sorts array of transactions based on sortBy ('timestamp' or 'amount') and sortOrder ('asc' or 'desc').
 */
export function sortTransactions(
  transactions: any[],
  sortBy: 'timestamp' | 'amount',
  sortOrder: 'asc' | 'desc',
): any[] {
  const direction = sortOrder === 'asc' ? 1 : -1;

  return [...transactions].sort((a, b) => {
    const valueA = sortBy === 'amount' ? (a.amountSOL ?? 0) : (a.blockTime ?? 0);
    const valueB = sortBy === 'amount' ? (b.amountSOL ?? 0) : (b.blockTime ?? 0);

    if (valueA === valueB) {
      return 0;
    }

    return valueA > valueB ? direction : -direction;
  });
}
