import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { HolderEntity } from './holder.entity';

@Entity('wallets')
export class WalletEntity {
  @PrimaryColumn({ type: 'varchar', length: 44 })
  address!: string;

  @Column({ type: 'bigint', default: '0' })
  balanceLamports!: string;

  @Column({ type: 'int', default: 0 })
  tokenCount!: number;

  @Column({ type: 'int', default: 0 })
  activityScore!: number;

  @Column({ type: 'varchar', nullable: true })
  firstSeenDate?: string;

  @UpdateDateColumn()
  lastUpdated!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => HolderEntity, (holder) => holder.wallet)
  holders!: HolderEntity[];
}
