import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PublicKey, ParsedAccountData } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SolanaService } from '../solana/solana.service';
import {
  decodeMetadata,
  getMetadataPda,
  TokenMetadata,
} from '../common/utils/metaplex.utils';

import {
  TOKEN_CACHE_TTL_MS,
  SPL_TOKEN_ACCOUNT_SIZE,
  MAX_HOLDERS_COUNT,
} from './constants/token.constants';

const CACHE_TTL_MS = TOKEN_CACHE_TTL_MS;
const MAX_HOLDERS = MAX_HOLDERS_COUNT;

interface CacheEntry {
  data: any;
  timestamp: number;
}

/** Shape of a `spl-token` parsed token-account `info` blob. */
interface ParsedTokenAccountInfo {
  owner?: string;
  tokenAmount?: { amount?: string; uiAmount?: number | null };
}

/** Shape of a `spl-token` parsed instruction `info` blob (union of variants). */
interface SplTokenInstructionInfo {
  mint?: string;
  amount?: string;
  tokenAmount?: { uiAmount?: number | null };
  source?: string;
  account?: string;
  destination?: string;
  authority?: string;
  mintAuthority?: string;
  multisigAuthority?: string;
}

interface ParsedInstruction {
  program?: string;
  parsed?: { type?: string; info: SplTokenInstructionInfo };
}

interface Holder {
  rank: number;
  tokenAccount: string;
  owner: string;
  balance: number;
  percentage: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private cache = new Map<string, CacheEntry>();

  constructor(private readonly solanaService: SolanaService) {}

  private getCached(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Fetch the Metaplex on-chain metadata (name/symbol/uri) for a mint.
   * Returns null when the token has no metadata account (common on devnet) or
   * when the account can't be decoded — never throws, so a missing metadata
   * account doesn't break the mint-info response.
   */
  private async fetchMetadata(
    mintPublicKey: PublicKey,
  ): Promise<TokenMetadata | null> {
    try {
      const pda = getMetadataPda(mintPublicKey);
      const conn = this.solanaService.getConnection();
      const account = await conn.getAccountInfo(pda);
      if (!account?.data) return null;
      return decodeMetadata(Buffer.from(account.data));
    } catch (error) {
      this.logger.warn(
        `Could not load metadata for ${mintPublicKey.toBase58()}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async getTokenInfo(mintAddress: string) {
    const cacheKey = `token:${mintAddress}`;
    const cached = this.getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const mintPublicKey = new PublicKey(mintAddress);
    const conn = this.solanaService.getConnection();
    const accountInfo = await conn.getParsedAccountInfo(mintPublicKey);

    if (!accountInfo.value) return null;

    const parsedData = accountInfo.value.data as ParsedAccountData;

    if (
      !parsedData ||
      typeof parsedData !== 'object' ||
      parsedData.program !== 'spl-token' ||
      parsedData.parsed?.type !== 'mint'
    ) {
      throw new BadRequestException('Not a valid SPL token mint');
    }

    const mintInfo = parsedData.parsed.info as {
      decimals?: number;
      supply?: string;
      mintAuthority?: string | null;
      freezeAuthority?: string | null;
      isInitialized?: boolean;
    };
    const decimals: number = mintInfo.decimals ?? 0;
    const rawSupply = BigInt(mintInfo.supply ?? '0');
    const divisor = BigInt(10 ** decimals);
    const formattedSupply =
      decimals > 0
        ? Number((rawSupply * 100n) / divisor) / 100
        : Number(rawSupply);

    const metadata = await this.fetchMetadata(mintPublicKey);

    const result = {
      mintAddress,
      metadata,
      decimals,
      supply: { raw: mintInfo.supply, formatted: formattedSupply },
      mintAuthority: mintInfo.mintAuthority ?? null,
      freezeAuthority: mintInfo.freezeAuthority ?? null,
      isInitialized: mintInfo.isInitialized ?? false,
      cached: false,
    };

    this.setCached(cacheKey, result);
    return result;
  }

  async getTokenHolders(mintAddress: string) {
    const cacheKey = `holders:${mintAddress}`;
    const cached = this.getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const tokenInfo = await this.getTokenInfo(mintAddress);
    if (!tokenInfo) return null;

    const totalSupply = Number(tokenInfo.supply.raw);
    const mintPublicKey = new PublicKey(mintAddress);

    let holders: Holder[] = [];
    let source: string = 'unavailable';
    let note: string | undefined;

    const network = process.env.SOLANA_NETWORK ?? 'devnet';
    const isMainnet = network === 'mainnet-beta';

    if (isMainnet) {
      // On mainnet tokens like USDC have millions of accounts.
      // Try Helius getTokenAccounts API; if it fails on free plan, return
      // an empty list gracefully rather than throwing a 500 error.
      try {
        this.logger.log(`Mainnet: using Helius API for holders of ${mintAddress}`);
        holders = await this.getHoldersViaHeliusApi(mintAddress, totalSupply);
        source = 'helius-api';
      } catch (error) {
        this.logger.warn(
          `Helius holders API failed for ${mintAddress}: ${(error as Error).message}`,
        );
        holders = [];
        source = 'unavailable';
        note =
          'Holder data unavailable on free RPC plan for large mainnet tokens. Upgrade to a paid Helius plan for full access.';
      }
    } else {
      try {
        ({ holders, source } = await this.getHoldersViaProgramAccounts(
          mintPublicKey,
          totalSupply,
        ));
      } catch (error) {
        // Public devnet RPC frequently disables getProgramAccounts; fall back to
        // the (max 20) largest-accounts call so the endpoint still responds.
        this.logger.warn(
          `getProgramAccounts failed for ${mintAddress}, falling back to largest accounts: ${(error as Error).message}`,
        );
        try {
          holders = await this.getHoldersViaLargestAccounts(mintPublicKey, totalSupply);
          source = 'getTokenLargestAccounts';
          note = 'Limited to top 20 — getProgramAccounts is disabled on this RPC endpoint';
        } catch {
          holders = [];
          source = 'unavailable';
          note = 'Holder data temporarily unavailable.';
        }
      }
    }

    const result = {
      mint: mintAddress,
      totalHoldersFound: holders.length,
      topCount: holders.length,
      source,
      holders,
      cached: false,
      ...(note ? { note } : {}),
    };

    this.setCached(cacheKey, result);
    return result;
  }

  /** Mainnet path: calls Helius getTokenAccounts API (handles 5M+ holder tokens). */
  private async getHoldersViaHeliusApi(
    mintAddress: string,
    totalSupply: number,
  ): Promise<Holder[]> {
    const apiKey = (process.env.SOLANA_RPC_URL ?? '').split('api-key=')[1];
    if (!apiKey) throw new Error('No Helius API key found in SOLANA_RPC_URL');

    const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-holders',
          method: 'getTokenAccounts',
          params: {
            page: 1,
            limit: 20,
            mint: mintAddress,
            options: { showZeroBalance: false },
          },
        }),
        signal: controller.signal,
      });

      const json = (await response.json()) as {
        result?: { token_accounts: { address: string; owner: string; amount: number }[] };
        error?: { message: string };
      };

      if (json.error) throw new Error(`Helius API error: ${json.error.message}`);

      const accounts = json.result?.token_accounts ?? [];
      accounts.sort((a, b) => b.amount - a.amount);
      const decimals = 6; // Default for most SPL tokens (USDC, USDT)

      return accounts.map((acc, index): Holder => ({
        rank: index + 1,
        tokenAccount: acc.address,
        owner: acc.owner,
        balance: acc.amount / Math.pow(10, decimals),
        percentage: this.toPercentage(acc.amount, totalSupply),
      }));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Enumerate every token account for the mint and rank the top 100 by balance. */
  private async getHoldersViaProgramAccounts(

    mintPublicKey: PublicKey,
    totalSupply: number,
  ): Promise<{ holders: Holder[]; source: string }> {
    const conn = this.solanaService.getConnection();
    const accounts = await conn.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: SPL_TOKEN_ACCOUNT_SIZE },
        { memcmp: { offset: 0, bytes: mintPublicKey.toBase58() } },
      ],
    });

    const holders = accounts
      .map((acc) => {
        const data = acc.account.data as ParsedAccountData;
        const info = (data?.parsed?.info ?? {}) as ParsedTokenAccountInfo;
        return {
          tokenAccount: acc.pubkey.toBase58(),
          owner: info.owner ?? 'Unknown',
          balance: info.tokenAmount?.uiAmount ?? 0,
          rawAmount: Number(info.tokenAmount?.amount ?? 0),
        };
      })
      .filter((h) => h.rawAmount > 0)
      .sort((a, b) => b.rawAmount - a.rawAmount)
      .slice(0, MAX_HOLDERS)
      .map((h, index) => ({
        rank: index + 1,
        tokenAccount: h.tokenAccount,
        owner: h.owner,
        balance: h.balance,
        percentage: this.toPercentage(h.rawAmount, totalSupply),
      }));

    return { holders, source: 'getProgramAccounts' };
  }

  /** Fallback path: getTokenLargestAccounts caps at 20 entries. */
  private async getHoldersViaLargestAccounts(
    mintPublicKey: PublicKey,
    totalSupply: number,
  ): Promise<Holder[]> {
    const conn = this.solanaService.getConnection();
    const largestAccounts = await conn.getTokenLargestAccounts(mintPublicKey);

    if (!largestAccounts.value?.length) return [];

    const resolved = await Promise.all(
      largestAccounts.value.map(async (acc, index): Promise<Holder | null> => {
        try {
          const accountInfo = await conn.getParsedAccountInfo(acc.address);
          const data = accountInfo.value?.data as ParsedAccountData | undefined;
          const info = (data?.parsed?.info ?? {}) as ParsedTokenAccountInfo;
          return {
            rank: index + 1,
            tokenAccount: acc.address.toBase58(),
            owner: info.owner ?? 'Unknown',
            balance: acc.uiAmount ?? 0,
            percentage: this.toPercentage(Number(acc.amount), totalSupply),
          };
        } catch {
          return null;
        }
      }),
    );

    return resolved.filter((h): h is Holder => h !== null);
  }

  private toPercentage(rawAmount: number, totalSupply: number): string {
    const pct = totalSupply > 0 ? (rawAmount / totalSupply) * 100 : 0;
    return pct.toFixed(4) + '%';
  }

  /**
   * Transfer history for a mint, derived from transactions that reference the
   * mint account. Captures checked transfers/mints/burns (which carry the mint)
   * reliably; plain unchecked transfers between token accounts may not appear,
   * especially on public RPC — surfaced via `note`. Not cached (dynamic data).
   */
  async getTokenTransfers(mintAddress: string, limit = 10) {
    const tokenInfo = await this.getTokenInfo(mintAddress);
    if (!tokenInfo) return null;

    const mintPublicKey = new PublicKey(mintAddress);
    const conn = this.solanaService.getConnection();

    // Over-fetch a little since not every signature yields a token movement.
    const fetchCount = Math.min(limit * 3, 100);
    const signatures = await conn.getSignaturesForAddress(mintPublicKey, {
      limit: fetchCount,
    });

    if (!signatures.length) {
      return { mint: mintAddress, count: 0, transfers: [] };
    }

    const parsedTxs = await conn.getParsedTransactions(
      signatures.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0 },
    );

    const transfers: Array<Record<string, unknown>> = [];

    parsedTxs.forEach((tx, i) => {
      if (!tx) return;
      const signature = signatures[i].signature;
      const blockTime = tx.blockTime ?? null;

      const inner =
        tx.meta?.innerInstructions?.flatMap((ii) => ii.instructions) ?? [];
      const instructions = [
        ...tx.transaction.message.instructions,
        ...inner,
      ] as ParsedInstruction[];

      for (const ix of instructions) {
        const movement = this.parseTokenMovement(ix, mintAddress);
        if (movement) {
          transfers.push({
            signature,
            blockTime,
            blockTimeISO: blockTime
              ? new Date(blockTime * 1000).toISOString()
              : null,
            ...movement,
          });
        }
      }
    });

    transfers.sort(
      (a, b) => ((b.blockTime as number) ?? 0) - ((a.blockTime as number) ?? 0),
    );

    return {
      mint: mintAddress,
      count: Math.min(transfers.length, limit),
      transfers: transfers.slice(0, limit),
      note: 'History is built from transactions referencing the mint; unchecked transfers between token accounts may not appear on public RPC.',
    };
  }

  /** Extract a normalized token movement from a parsed instruction, or null. */
  private parseTokenMovement(ix: ParsedInstruction, mintAddress: string) {
    if (ix?.program !== 'spl-token' || !ix.parsed) return null;

    const { type, info } = ix.parsed;
    const RELEVANT = [
      'transfer',
      'transferChecked',
      'mintTo',
      'mintToChecked',
      'burn',
      'burnChecked',
    ];
    if (!type || !RELEVANT.includes(type)) return null;

    // Checked variants carry the mint — drop movements for other mints.
    if (info.mint && info.mint !== mintAddress) return null;

    const amount = info.tokenAmount?.uiAmount ?? info.amount ?? null;

    return {
      type,
      amount,
      source: info.source ?? info.account ?? null,
      destination: info.destination ?? null,
      authority:
        info.authority ?? info.mintAuthority ?? info.multisigAuthority ?? null,
    };
  }
}
