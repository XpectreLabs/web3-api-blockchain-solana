import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SolanaService } from '../solana/solana.service';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly solanaService: SolanaService,
    private readonly transactionService: TransactionService,
  ) {}

  @Get(':signature')
  async getTransactionDetail(@Param('signature') signature: string) {
    const transaction =
      await this.solanaService.getTransactionDetail(signature);
    if (!transaction) throw new NotFoundException('Transaction not found');
    return { success: true, data: transaction };
  }

  @Get()
  async listTransactions(@Query('wallet') wallet: string) {
    if (!wallet) throw new BadRequestException('wallet is required');
    const result = await this.transactionService.queryTransactions({ wallet });
    return { success: true, data: result };
  }
}
