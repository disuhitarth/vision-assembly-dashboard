import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlcDriver } from './interfaces/plc-driver.interface';
import { Part } from '../../entities/part.entity';
import { Alarm } from '../../entities/alarm.entity';
import { EventEmitter } from 'events';

@Injectable()
export class PlcService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(PlcService.name);
  private tags = new Map<string, any>();
  private subscribers = new Map<string, Set<(value: any) => void>>();

  constructor(
    @Inject('PLC_DRIVER') private readonly plcDriver: PlcDriver,
    @InjectRepository(Part) private readonly partRepository: Repository<Part>,
    @InjectRepository(Alarm) private readonly alarmRepository: Repository<Alarm>,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      await this.plcDriver.connect();
      this.logger.log('PLC Driver connected successfully');
      
      // Subscribe to driver events
      this.plcDriver.on('tag_changed', (tag: string, value: any) => {
        this.handleTagChange(tag, value);
      });
      
      this.plcDriver.on('alarm', (alarm: any) => {
        this.handleAlarm(alarm);
      });
      
      // Start monitoring critical tags
      this.startTagMonitoring();
      
    } catch (error) {
      this.logger.error('Failed to initialize PLC service', error.stack);
    }
  }

  async readTag(tag: string): Promise<any> {
    try {
      const value = await this.plcDriver.readTag(tag);
      this.tags.set(tag, value);
      return value;
    } catch (error) {
      this.logger.error(`Failed to read tag ${tag}`, error.stack);
      throw error;
    }
  }

  async writeTag(tag: string, value: any): Promise<void> {
    try {
      // Safety check for critical operations
      if (this.isCriticalTag(tag)) {
        this.logger.warn(`Writing to critical tag: ${tag} = ${value}`);
        // Add safety interlocks here
      }
      
      await this.plcDriver.writeTag(tag, value);
      this.logger.log(`Tag written: ${tag} = ${value}`);
      
      // Update cache
      this.tags.set(tag, value);
      
    } catch (error) {
      this.logger.error(`Failed to write tag ${tag}`, error.stack);
      throw error;
    }
  }

  subscribe(tags: string[], callback: (tag: string, value: any) => void): () => void {
    tags.forEach(tag => {
      if (!this.subscribers.has(tag)) {
        this.subscribers.set(tag, new Set());
      }
      this.subscribers.get(tag).add(callback);
    });

    // Return unsubscribe function
    return () => {
      tags.forEach(tag => {
        const tagSubscribers = this.subscribers.get(tag);
        if (tagSubscribers) {
          tagSubscribers.delete(callback);
          if (tagSubscribers.size === 0) {
            this.subscribers.delete(tag);
          }
        }
      });
    };
  }

  getTagSnapshot(): Record<string, any> {
    return Object.fromEntries(this.tags);
  }

  @Cron(CronExpression.EVERY_SECOND)
  private async updateCriticalTags() {
    const criticalTags = [
      'Line.State',
      'Line.RunCmd',
      'Station01.CycleTimeMs',
      'Station02.CycleTimeMs',
      'Part.Counter',
      'Quality.PassCount',
      'Quality.FailCount'
    ];

    for (const tag of criticalTags) {
      try {
        await this.readTag(tag);
      } catch (error) {
        // Continue monitoring other tags
      }
    }
  }

  private handleTagChange(tag: string, value: any) {
    this.tags.set(tag, value);
    
    // Notify subscribers
    const tagSubscribers = this.subscribers.get(tag);
    if (tagSubscribers) {
      tagSubscribers.forEach(callback => callback(tag, value));
    }
    
    // Emit for WebSocket
    this.emit('tag_changed', { tag, value, timestamp: Date.now() });
    
    // Handle special logic
    this.processTagLogic(tag, value);
  }

  private async handleAlarm(alarm: any) {
    try {
      const alarmEntity = this.alarmRepository.create({
        code: alarm.code,
        severity: alarm.severity,
        message: alarm.message,
        station: alarm.station || 0,
        status: 'active',
        context: alarm.context,
      });
      
      await this.alarmRepository.save(alarmEntity);
      this.emit('alarm', alarmEntity);
      
    } catch (error) {
      this.logger.error('Failed to save alarm', error.stack);
    }
  }

  private async processTagLogic(tag: string, value: any) {
    // Part completion logic
    if (tag === 'Part.Completed' && value === true) {
      await this.handlePartCompletion();
    }
    
    // Line state changes
    if (tag === 'Line.State') {
      this.emit('line_state_changed', value);
    }
    
    // Cycle time monitoring
    if (tag.includes('CycleTimeMs')) {
      const station = this.extractStation(tag);
      this.emit('cycle_time', { station, cycleTime: value });
    }
  }

  private async handlePartCompletion() {
    try {
      const cycleTime = this.tags.get('Station01.CycleTimeMs') || 850;
      const result = this.tags.get('Quality.LastResult') || 'pass';
      
      const part = this.partRepository.create({
        sku: 'DEMO-001',
        batch: `B${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        station: 1,
        result: result,
        cycleTimeMs: cycleTime,
      });
      
      await this.partRepository.save(part);
      this.emit('part_completed', part);
      
    } catch (error) {
      this.logger.error('Failed to handle part completion', error.stack);
    }
  }

  private isCriticalTag(tag: string): boolean {
    const criticalTags = [
      'Line.RunCmd',
      'Line.Stop',
      'Emergency.Stop',
      'Safety.Reset'
    ];
    return criticalTags.includes(tag);
  }

  private extractStation(tag: string): number {
    const match = tag.match(/Station(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private startTagMonitoring() {
    this.logger.log('Started PLC tag monitoring');
  }
}