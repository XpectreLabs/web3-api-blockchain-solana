import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import { SolanaService } from '../solana/solana.service';
import { WalletService } from './wallet.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly solanaService: SolanaService,
    private readonly walletService: WalletService,
  ) {}

  @Public()
  @Get('health')
  async healthCheck() {
    const info = await this.solanaService.getClusterInfo();
    return { success: true, data: { status: 'connected', ...info } };
  }

  @Get(':address/balance')
  async getBalance(@Param('address') address: string) {
    this.validateAddress(address);
    const balance = await this.solanaService.getBalance(address);
    return { success: true, data: balance };
  }

  @Get(':address/transactions')
  async getRecentTransactions(
    @Param('address') address: string,
    @Query('limit') limit?: string,
  ) {
    this.validateAddress(address);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit || '10', 10) || 10, 1),
      50,
    );
    const transactions = await this.solanaService.getRecentTransactions(
      address,
      parsedLimit,
    );
    return {
      success: true,
      data: { address, count: transactions.length, transactions },
    };
  }

  @Get(':address/analytics')
  async getWalletAnalytics(@Param('address') address: string) {
    this.validateAddress(address);
    const data = await this.walletService.getWalletAnalytics(address);
    return { success: true, data };
  }

  private validateAddress(address: string) {
    try {
      const pubkey = new PublicKey(address);
      if (!PublicKey.isOnCurve(pubkey.toBytes())) throw new Error();
    } catch {
      throw new BadRequestException('Invalid Solana public address');
    }
  }
}

