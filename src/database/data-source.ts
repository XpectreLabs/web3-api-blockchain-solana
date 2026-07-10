import { DataSource } from 'typeorm';
import { WalletEntity } from './entities/wallet.entity';
import { TokenEntity } from './entities/token.entity';
import { HolderEntity } from './entities/holder.entity';
import { TransactionEntity } from './entities/transaction.entity';
import * as dotenv from 'dotenv';

// Load .env variables
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [WalletEntity, TokenEntity, HolderEntity, TransactionEntity],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
