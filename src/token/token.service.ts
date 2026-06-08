import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import { SolanaService } from '../solana/solana.service';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: any;
  timestamp: number;
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

  async getTokenInfo(mintAddress: string) {
    const cacheKey = `token:${mintAddress}`;
    const cached = this.getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const mintPublicKey = new PublicKey(mintAddress);
    const conn = this.solanaService.getConnection();
    const accountInfo = await conn.getParsedAccountInfo(mintPublicKey);

    if (!accountInfo.value) return null;

    const parsedData = accountInfo.value.data as any;

    if (
      !parsedData ||
      typeof parsedData !== 'object' ||
      parsedData.program !== 'spl-token' ||
      parsedData.parsed?.type !== 'mint'
    ) {
      throw new BadRequestException('Not a valid SPL token mint');
    }

    const mintInfo = parsedData.parsed.info;
    const decimals: number = mintInfo.decimals ?? 0;
    const rawSupply = BigInt(mintInfo.supply ?? '0');
    const divisor = BigInt(10 ** decimals);
    const formattedSupply =
      decimals > 0
        ? Number((rawSupply * 100n) / divisor) / 100
        : Number(rawSupply);

    const result = {
      mintAddress,
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
    const conn = this.solanaService.getConnection();

    const largestAccounts = await conn.getTokenLargestAccounts(mintPublicKey);

    if (!largestAccounts.value || largestAccounts.value.length === 0) {
      return {
        mint: mintAddress,
        totalHoldersFound: 0,
        topCount: 0,
        holders: [],
        cached: false,
      };
    }

    const accountPromises = largestAccounts.value.map(
      async (acc: any, index: number) => {
        try {
          const accountInfo = await conn.getParsedAccountInfo(acc.address);
          const owner =
            (accountInfo.value?.data as any)?.parsed?.info?.owner || 'Unknown';

          const balanceRaw = Number(acc.amount);
          let percentage = 0;
          if (totalSupply > 0) percentage = (balanceRaw / totalSupply) * 100;

          return {
            rank: index + 1,
            tokenAccount: acc.address.toBase58(),
            owner,
            balance: acc.uiAmount,
            percentage: percentage.toFixed(4) + '%',
          };
        } catch {
          return null;
        }
      },
    );

    const resolved = await Promise.all(accountPromises);
    const holders = resolved.filter((h: any) => h !== null);

    const result = {
      mint: mintAddress,
      totalHoldersFound: holders.length,
      topCount: holders.length,
      holders,
      cached: false,
      note: 'Limited to top 20 due to Devnet public RPC constraints',
    };

    this.setCached(cacheKey, result);
    return result;
  }
}
