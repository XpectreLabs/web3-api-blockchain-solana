import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { HolderEntity } from './holder.entity';

@Entity('tokens')
export class TokenEntity {
  @PrimaryColumn({ type: 'varchar', length: 44 })
  mint!: string;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  symbol?: string;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  name?: string;

  @Column({ type: 'varchar', nullable: true })
  uri?: string;

  @Column({ type: 'int', default: 0 })
  decimals!: number;

  @Column({ type: 'bigint', default: '0' })
  supplyRaw!: string;

  @Column({ type: 'numeric', precision: 20, scale: 9, default: 0 })
  supplyFormatted!: number;

  @Column({ type: 'varchar', length: 44, nullable: true })
  mintAuthority?: string;

  @Column({ type: 'varchar', length: 44, nullable: true })
  freezeAuthority?: string;

  @UpdateDateColumn()
  lastUpdated!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => HolderEntity, (holder) => holder.token)
  holders!: HolderEntity[];
}
