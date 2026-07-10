import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getStatus() {
    return {
      success: true,
      message: 'Solana Blockchain API - Running',
      version: '2.0.0',
      framework: 'NestJS',
      timestamp: new Date().toISOString(),
    };
  }
}
