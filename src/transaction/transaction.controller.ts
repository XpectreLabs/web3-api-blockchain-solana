import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SolanaService } from '../solana/solana.service';
import { TransactionService } from './transaction.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly solanaService: SolanaService,
    private readonly transactionService: TransactionService,
  ) {}

  @Get(':signature')
  async getTransactionDetail(@Param('signature') signature: string) {
    if (!signature || signature.length < 64) {
      throw new BadRequestException('Invalid transaction signature');
    }
    const transaction =
      await this.solanaService.getTransactionDetail(signature);
    return { success: true, data: transaction };
  }

  @Get()
  async listTransactions(@Query() query: QueryTransactionsDto) {
    const result = await this.transactionService.queryTransactions(query);
    return { success: true, data: result };
  }
}
