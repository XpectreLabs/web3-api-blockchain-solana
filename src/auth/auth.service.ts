import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserTier } from './dto/login.dto';

export interface JwtPayload {
  username: string;
  tier: UserTier;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async generateToken(username: string, tier: UserTier = UserTier.FREE): Promise<{ access_token: string }> {
    const payload: JwtPayload = { username, tier };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token };
  }
}
