import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('alarms')
export class Alarm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 20 })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'varchar', length: 255 })
  message: string;

  @Column({ type: 'integer' })
  station: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'acknowledged' | 'cleared';

  @Column({ type: 'varchar', length: 100, nullable: true })
  acknowledged_by?: string;

  @Column({ type: 'timestamptz', nullable: true })
  acknowledged_at?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cleared_at?: Date;

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}