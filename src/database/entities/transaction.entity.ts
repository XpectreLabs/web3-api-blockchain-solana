import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryColumn({ type: 'varchar', length: 88 })
  signature!: string;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  walletAddress!: string;

  @Column({ type: 'bigint' })
  @Index()
  blockTime!: string;

  @Column({ type: 'bigint' })
  @Index()
  slot!: string;

  @Column({ type: 'bigint' })
  fee!: string;

  @Column({ type: 'text', nullable: true }) 
  error?: string;

  @Column({ type: 'jsonb', nullable: true })
  rawData?: any;

  @CreateDateColumn()
  createdAt!: Date;
}
