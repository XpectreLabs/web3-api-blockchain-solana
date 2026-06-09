import { Controller, Get, Param } from '@nestjs/common';
import { TokenService } from './token.service';

@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get(':mint')
  async getTokenInfo(@Param('mint') mint: string) {
    const data = await this.tokenService.getTokenInfo(mint);
    return { success: true, data };
  }

  @Get(':mint/holders')
  async getTokenHolders(@Param('mint') mint: string) {
    const data = await this.tokenService.getTokenHolders(mint);
    return { success: true, data };
  }
}
