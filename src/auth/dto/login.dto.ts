import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum UserTier {
  FREE = 'free',
  PRO = 'pro',
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEnum(UserTier)
  @IsOptional()
  tier?: UserTier = UserTier.FREE;
}
