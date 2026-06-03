const solanaWeb3 = require('@solana/web3.js');

const SYSTEM_PROGRAM_ID = solanaWeb3.SystemProgram.programId.toBase58();
const COMPUTE_BUDGET_PROGRAM_ID = 'ComputeBudget111111111111111111111111111111';

const TRANSACTION_TYPES = ['transfer', 'instruction'];

function getAccountKeys(tx) {
  if (tx.transaction.message.getAccountKeys) {
    return tx.transaction.message.getAccountKeys().staticAccountKeys;
  }
  return tx.transaction.message.accountKeys;
}

/**
 * @param {import('@solana/web3.js').VersionedTransactionResponse} tx
 * @returns {'transfer'|'instruction'}
 */
function inferTransactionType(tx) {
  const accountKeys = getAccountKeys(tx);
  const instructions = tx.transaction.message.compiledInstructions
    || tx.transaction.message.instructions
    || [];

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
 * @param {import('@solana/web3.js').VersionedTransactionResponse} tx
 * @param {string} [walletAddress]
 */
function extractAmountSOL(tx, walletAddress) {
  const accountKeys = getAccountKeys(tx).map((key) => key.toBase58());

  if (walletAddress) {
    const index = accountKeys.indexOf(walletAddress);
    if (index >= 0) {
      const pre = tx.meta?.preBalances?.[index] ?? 0;
      const post = tx.meta?.postBalances?.[index] ?? 0;
      return Math.abs(post - pre) / solanaWeb3.LAMPORTS_PER_SOL;
    }
  }

  let maxLamports = 0;
  for (let i = 0; i < (tx.meta?.preBalances?.length ?? 0); i += 1) {
    const delta = Math.abs((tx.meta.postBalances[i] ?? 0) - (tx.meta.preBalances[i] ?? 0));
    if (delta > maxLamports) {
      maxLamports = delta;
    }
  }

  return maxLamports / solanaWeb3.LAMPORTS_PER_SOL;
}

function sortTransactions(transactions, sortBy, sortOrder) {
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

module.exports = {
  TRANSACTION_TYPES,
  inferTransactionType,
  extractAmountSOL,
  sortTransactions,
};
