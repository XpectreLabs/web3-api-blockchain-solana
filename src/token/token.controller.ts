import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TokenService } from './token.service';

@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get(':mint')
  async getTokenInfo(@Param('mint') mint: string) {
    const data = await this.tokenService.getTokenInfo(mint);
    if (!data) throw new NotFoundException('Token mint not found');
    return { success: true, data };
  }

  @Get(':mint/holders')
  async getTokenHolders(@Param('mint') mint: string) {
    const data = await this.tokenService.getTokenHolders(mint);
    if (!data) throw new NotFoundException('Token mint not found');
    return { success: true, data };
  }
}
