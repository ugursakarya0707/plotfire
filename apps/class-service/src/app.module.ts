import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ClassController } from './controllers/class.controller';
import { EnrollmentController } from './controllers/enrollment.controller';
import { ClassService } from './services/class.service';
import { EnrollmentService } from './services/enrollment.service';
import { ClassRepository } from './repositories/class.repository';
import { EnrollmentRepository } from './repositories/enrollment.repository';
import { ClassEntity } from './entities/class.entity';
import { EnrollmentEntity } from './entities/enrollment.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [ClassEntity, EnrollmentEntity],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    TypeOrmModule.forFeature([ClassEntity, EnrollmentEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'postply-secret-key',
        signOptions: {
          expiresIn: '7d',
        },
      }),
    }),
  ],
  controllers: [ClassController, EnrollmentController],
  providers: [
    ClassService,
    EnrollmentService,
    ClassRepository,
    EnrollmentRepository,
    JwtAuthGuard,
  ],
})
export class AppModule {}
