import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
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
