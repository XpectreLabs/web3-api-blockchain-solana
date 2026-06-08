import { IsString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTransactionsDto {
  @IsString()
  wallet!: string;

  @IsOptional()
  @IsIn(['transfer', 'instruction'])
  type?: 'transfer' | 'instruction';

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
