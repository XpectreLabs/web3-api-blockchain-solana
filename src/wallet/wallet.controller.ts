import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SolanaService } from '../solana/solana.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly solanaService: SolanaService) {}

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

  private validateAddress(address: string) {
    if (!address || address.length < 32 || address.length > 44) {
      throw new BadRequestException('Invalid Solana public address');
    }
  }
}
