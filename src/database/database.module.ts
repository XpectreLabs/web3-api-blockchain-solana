import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WalletEntity } from './entities/wallet.entity';
import { TokenEntity } from './entities/token.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { HolderEntity } from './entities/holder.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [WalletEntity, TokenEntity, TransactionEntity, HolderEntity],
        synchronize: false,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
