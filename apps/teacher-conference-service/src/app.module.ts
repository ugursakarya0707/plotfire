import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { TeacherConferenceController } from './controllers/teacher-conference.controller';
import { FavoriteTeacherController } from './controllers/favorite-teacher.controller';
import { TeacherConferenceService } from './services/teacher-conference.service';
import { FavoriteTeacherService } from './services/favorite-teacher.service';
import { TeacherConference, TeacherConferenceSchema } from './schemas/teacher-conference.schema';
import { FavoriteTeacher, FavoriteTeacherSchema } from './schemas/favorite-teacher.schema';

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
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [TeacherConferenceController, FavoriteTeacherController],
  providers: [TeacherConferenceService, FavoriteTeacherService],
})
export class AppModule {}
