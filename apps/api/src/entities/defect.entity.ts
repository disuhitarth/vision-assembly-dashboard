import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Part } from './part.entity';

@Entity('defects')
export class Defect {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'part_id' })
  partId: string;

  @Column({ type: 'uuid', name: 'frame_id' })
  frameId: string;

  @Column({ type: 'varchar', length: 50 })
  class: string;

  @Column({ type: 'float' })
  confidence: number;

  @Column({ type: 'integer' })
  station: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  disposition: 'accept' | 'reject' | 'rework' | 'pending';

  @Column({ type: 'jsonb', nullable: true })
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @Column({ type: 'varchar', length: 20, default: 'high' })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => Part, part => part.defects)
  @JoinColumn({ name: 'part_id' })
  part: Part;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}