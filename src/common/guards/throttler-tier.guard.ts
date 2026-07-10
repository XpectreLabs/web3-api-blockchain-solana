import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class ThrottlerTierGuard extends ThrottlerGuard {
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context } = requestProps;
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Apply limits: 1000 req/min for pro tier, 100 req/min for free tier
    requestProps.limit = user?.tier === 'pro' ? 1000 : 100;
    requestProps.ttl = 60000; // 60 seconds (1 minute)

    return super.handleRequest(requestProps);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Rate limit per user if authenticated, fallback to IP address for public endpoints
    return req.user?.username || req.ip;
  }
}
