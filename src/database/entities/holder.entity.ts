import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { WalletEntity } from './wallet.entity';
import { TokenEntity } from './token.entity';

@Entity('holders')
@Unique(['tokenMint', 'walletAddress'])
export class HolderEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  tokenMint!: string;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  walletAddress!: string;

  @Column({ type: 'bigint', default: '0' })
  @Index()
  balance!: string;

  @Column({ type: 'int', nullable: true })
  @Index()
  rank?: number;

  @UpdateDateColumn()
  lastUpdated!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => TokenEntity, (token) => token.holders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenMint' })
  token!: TokenEntity;

  @ManyToOne(() => WalletEntity, (wallet) => wallet.holders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletAddress' })
  wallet!: WalletEntity;
}
