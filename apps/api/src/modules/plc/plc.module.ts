import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlcController } from './plc.controller';
import { PlcService } from './plc.service';
import { MockPlcDriver } from './drivers/mock-plc.driver';
import { EnipPlcDriver } from './drivers/enip-plc.driver';
import { Part } from '../../entities/part.entity';
import { Alarm } from '../../entities/alarm.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Part, Alarm])],
  controllers: [PlcController],
  providers: [
    PlcService,
    {
      provide: 'PLC_DRIVER',
      useFactory: () => {
        const mode = process.env.MODE || 'demo';
        return mode === 'live' ? new EnipPlcDriver() : new MockPlcDriver();
      },
    },
  ],
  exports: [PlcService],
})
export class PlcModule {}