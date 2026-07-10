import { Controller, Get, Param, Query } from '@nestjs/common';
import { TokenService } from './token.service';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { QueryTransfersDto } from './dto/query-transfers.dto';

@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get(':mint')
  async getTokenInfo(@Param('mint', SolanaAddressPipe) mint: string) {
    const data = await this.tokenService.getTokenInfo(mint);
    return { success: true, data };
  }

  @Get(':mint/holders')
  async getTokenHolders(@Param('mint', SolanaAddressPipe) mint: string) {
    const data = await this.tokenService.getTokenHolders(mint);
    return { success: true, data };
  }

  @Get(':mint/transfers')
  async getTokenTransfers(
    @Param('mint', SolanaAddressPipe) mint: string,
    @Query() query: QueryTransfersDto,
  ) {
    const data = await this.tokenService.getTokenTransfers(mint, query.limit);
    return { success: true, data };
  }
}
