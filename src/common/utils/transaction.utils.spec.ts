import {
  inferTransactionType,
  extractAmountSOL,
  sortTransactions,
  SolanaTransactionResponse,
} from './transaction.utils';
import { TransactionType } from '../constants/transaction.constants';

describe('Transaction Utilities', () => {
  const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
  const COMPUTE_BUDGET_PROGRAM_ID = 'ComputeBudget111111111111111111111111111111';
  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

  const walletA = '7wgr184vtmpXpXLoijuvNGznpSsdFUguRQKtxV6eMAJt';
  const walletB = 'Brvtv3kxWV6zpmP6ERm346kPLsgMKz577tCcuge8e9hB';

  describe('inferTransactionType', () => {
    it('should return TRANSFER for transactions only using System Program', () => {
      const mockTx: SolanaTransactionResponse = {
        transaction: {
          message: {
            accountKeys: [
              { toBase58: () => walletA },
              { toBase58: () => walletB },
              { toBase58: () => SYSTEM_PROGRAM_ID },
            ],
            compiledInstructions: [
              { programIdIndex: 2, accounts: [0, 1] },
            ],
          },
        },
      };

      const result = inferTransactionType(mockTx);
      expect(result).toBe(TransactionType.TRANSFER);
    });

    it('should return TRANSFER when using System Program and Compute Budget Program', () => {
      const mockTx: SolanaTransactionResponse = {
        transaction: {
          message: {
            accountKeys: [
              { toBase58: () => walletA },
              { toBase58: () => walletB },
              { toBase58: () => SYSTEM_PROGRAM_ID },
              { toBase58: () => COMPUTE_BUDGET_PROGRAM_ID },
            ],
            compiledInstructions: [
              { programIdIndex: 3, accounts: [] }, // Compute Budget
              { programIdIndex: 2, accounts: [0, 1] }, // System Transfer
            ],
          },
        },
      };

      const result = inferTransactionType(mockTx);
      expect(result).toBe(TransactionType.TRANSFER);
    });

    it('should return INSTRUCTION when using other programs (e.g. Token Program)', () => {
      const mockTx: SolanaTransactionResponse = {
        transaction: {
          message: {
            accountKeys: [
              { toBase58: () => walletA },
              { toBase58: () => walletB },
              { toBase58: () => TOKEN_PROGRAM_ID },
            ],
            compiledInstructions: [
              { programIdIndex: 2, accounts: [0, 1] }, // Token instruction
            ],
          },
        },
      };

      const result = inferTransactionType(mockTx);
      expect(result).toBe(TransactionType.INSTRUCTION);
    });

    it('should handle missing messages or instruction arrays gracefully', () => {
      const mockTx: any = {
        transaction: {},
      };
      expect(inferTransactionType(mockTx)).toBe(TransactionType.INSTRUCTION);
    });
  });

  describe('extractAmountSOL', () => {
    it('should extract correct SOL amount for a specific wallet address', () => {
      const mockTx: SolanaTransactionResponse = {
        meta: {
          preBalances: [2_000_000_000, 1_000_000_000],
          postBalances: [1_500_000_000, 1_499_995_000],
        },
        transaction: {
          message: {
            accountKeys: [walletA, walletB],
          },
        },
      };

      // walletA change: |1.5 - 2.0| = 0.5 SOL
      const amount = extractAmountSOL(mockTx, walletA);
      expect(amount).toBe(0.5);
    });

    it('should return max lamport delta in SOL when no wallet is specified', () => {
      const mockTx: SolanaTransactionResponse = {
        meta: {
          preBalances: [2_000_000_000, 1_000_000_000],
          postBalances: [1_500_000_000, 1_800_000_000], // delta A = 0.5, delta B = 0.8
        },
        transaction: {
          message: {
            accountKeys: [walletA, walletB],
          },
        },
      };

      const amount = extractAmountSOL(mockTx);
      expect(amount).toBe(0.8);
    });

    it('should return 0 if the wallet address is not found in the transaction keys', () => {
      const mockTx: SolanaTransactionResponse = {
        meta: {
          preBalances: [2_000_000_000],
          postBalances: [1_500_000_000],
        },
        transaction: {
          message: {
            accountKeys: [walletA],
          },
        },
      };

      const amount = extractAmountSOL(mockTx, walletB); // walletB not present
      expect(amount).toBe(0);
    });

    it('should return 0 when preBalances or postBalances are missing or empty', () => {
      const mockTxNoMeta: SolanaTransactionResponse = {
        transaction: { message: { accountKeys: [walletA] } },
      };
      expect(extractAmountSOL(mockTxNoMeta, walletA)).toBe(0);

      const mockTxEmptyBalances: SolanaTransactionResponse = {
        meta: { preBalances: [], postBalances: [] },
        transaction: { message: { accountKeys: [walletA] } },
      };
      expect(extractAmountSOL(mockTxEmptyBalances, walletA)).toBe(0);
    });

    it('should return 0 when index is out of bounds of the pre/post balances array', () => {
      const mockTxIncomplete: SolanaTransactionResponse = {
        meta: {
          preBalances: [1_000_000_000], // Only 1 element
          postBalances: [1_000_000_000],
        },
        transaction: {
          message: {
            accountKeys: [walletA, walletB], // 2 elements, walletB index is 1
          },
        },
      };

      expect(extractAmountSOL(mockTxIncomplete, walletB)).toBe(0);
    });
  });

  describe('sortTransactions', () => {
    const tx1 = { blockTime: 1000, amountSOL: 1.5 };
    const tx2 = { blockTime: 2000, amountSOL: 0.5 };
    const tx3 = { blockTime: 1500, amountSOL: 2.0 };
    const list = [tx1, tx2, tx3];

    it('should sort by timestamp asc', () => {
      const sorted = sortTransactions(list, 'timestamp', 'asc');
      expect(sorted[0].blockTime).toBe(1000);
      expect(sorted[1].blockTime).toBe(1500);
      expect(sorted[2].blockTime).toBe(2000);
    });

    it('should sort by timestamp desc', () => {
      const sorted = sortTransactions(list, 'timestamp', 'desc');
      expect(sorted[0].blockTime).toBe(2000);
      expect(sorted[1].blockTime).toBe(1500);
      expect(sorted[2].blockTime).toBe(1000);
    });

    it('should sort by amount asc', () => {
      const sorted = sortTransactions(list, 'amount', 'asc');
      expect(sorted[0].amountSOL).toBe(0.5);
      expect(sorted[1].amountSOL).toBe(1.5);
      expect(sorted[2].amountSOL).toBe(2.0);
    });

    it('should sort by amount desc', () => {
      const sorted = sortTransactions(list, 'amount', 'desc');
      expect(sorted[0].amountSOL).toBe(2.0);
      expect(sorted[1].amountSOL).toBe(1.5);
      expect(sorted[2].amountSOL).toBe(0.5);
    });

    it('should handle equal values neutrally', () => {
      const txSameA = { blockTime: 1000, amountSOL: 1.0 };
      const txSameB = { blockTime: 1000, amountSOL: 1.0 };
      const sorted = sortTransactions([txSameA, txSameB], 'timestamp', 'asc');
      expect(sorted.length).toBe(2);
    });
  });
});
