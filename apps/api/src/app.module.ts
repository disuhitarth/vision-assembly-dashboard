import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';

// Core modules
import { PlcModule } from './modules/plc/plc.module';
import { VisionModule } from './modules/vision/vision.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CopilotModule } from './modules/copilot/copilot.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

// Entities
import { Part } from './entities/part.entity';
import { Defect } from './entities/defect.entity';
import { Alarm } from './entities/alarm.entity';
import { User } from './entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Database
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Part, Defect, Alarm, User, AuditLog],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: parseInt(process.env.API_RATE_LIMIT || '1000'),
    }),
    
    // Task scheduling
    ScheduleModule.forRoot(),
    
    // JWT
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '3600s' },
    }),
    
    // Application modules
    AuthModule,
    PlcModule,
    VisionModule,
    WebSocketModule,
    AnalyticsModule,
    CopilotModule,
    HealthModule,
  ],
})
export class AppModule {}