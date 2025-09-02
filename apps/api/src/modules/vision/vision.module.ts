import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisionController } from './vision.controller';
import { VisionService } from './vision.service';
import { WebcamAdapter } from './adapters/webcam.adapter';
import { KeyenceAdapter } from './adapters/keyence.adapter';
import { DefectDetectionService } from './services/defect-detection.service';
import { Part } from '../../entities/part.entity';
import { Defect } from '../../entities/defect.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Part, Defect])],
  controllers: [VisionController],
  providers: [
    VisionService,
    DefectDetectionService,
    {
      provide: 'VISION_ADAPTER',
      useFactory: () => {
        const mode = process.env.MODE || 'demo';
        return mode === 'live' ? new KeyenceAdapter() : new WebcamAdapter();
      },
    },
  ],
  exports: [VisionService],
})
export class VisionModule {}