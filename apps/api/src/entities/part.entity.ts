import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Defect } from './defect.entity';

@Entity('parts')
export class Part {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  sku: string;

  @Column({ type: 'varchar', length: 50 })
  batch: string;

  @Column({ type: 'integer' })
  station: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  result: 'pass' | 'fail' | 'pending' | 'rework';

  @Column({ type: 'integer', name: 'cycle_time_ms' })
  cycleTimeMs: number;

  @Column({ type: 'float', nullable: true })
  quality_score?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @OneToMany(() => Defect, defect => defect.part)
  defects: Defect[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}