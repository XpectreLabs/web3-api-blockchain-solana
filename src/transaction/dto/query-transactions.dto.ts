import {
  IsString,
  Length,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../../common/constants/transaction';

export class QueryTransactionsDto {
  @IsString()
  @Length(32, 44, {
    message: 'Wallet address must be between 32 and 44 characters',
  })
  wallet!: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsIn(['timestamp', 'amount'])
  sortBy?: 'timestamp' | 'amount' = 'timestamp';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
