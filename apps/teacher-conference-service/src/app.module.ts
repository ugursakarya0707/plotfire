import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { TeacherConferenceController } from './controllers/teacher-conference.controller';
import { FavoriteTeacherController } from './controllers/favorite-teacher.controller';
import { TimeSlotController } from './controllers/time-slot.controller';
import { TeacherConferenceService } from './services/teacher-conference.service';
import { FavoriteTeacherService } from './services/favorite-teacher.service';
import { TimeSlotService } from './services/time-slot.service';
import { TeacherConference, TeacherConferenceSchema } from './schemas/teacher-conference.schema';
import { FavoriteTeacher, FavoriteTeacherSchema } from './schemas/favorite-teacher.schema';
import { TimeSlot, TimeSlotSchema } from './schemas/time-slot.schema';
import { Reservation, ReservationSchema } from './schemas/reservation.schema';
import { ReservationService } from './services/reservation.service';
import { ReservationController } from './controllers/reservation.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/teacher-conference',
      }),
    }),
    MongooseModule.forFeature([
      { name: TeacherConference.name, schema: TeacherConferenceSchema },
      { name: FavoriteTeacher.name, schema: FavoriteTeacherSchema },
      { name: TimeSlot.name, schema: TimeSlotSchema },
      { name: Reservation.name, schema: ReservationSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'postply-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [TeacherConferenceController, FavoriteTeacherController, TimeSlotController, ReservationController],
  providers: [
    TeacherConferenceService, 
    FavoriteTeacherService, 
    TimeSlotService, 
    ReservationService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
