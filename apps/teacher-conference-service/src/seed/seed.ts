import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TeacherConference, TeacherConferenceSchema } from '../schemas/teacher-conference.schema';
import { FavoriteTeacher, FavoriteTeacherSchema } from '../schemas/favorite-teacher.schema';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

export class SeedService {
  constructor(
    @InjectModel(TeacherConference.name) private teacherConferenceModel: Model<TeacherConference>,
    @InjectModel(FavoriteTeacher.name) private favoriteTeacherModel: Model<FavoriteTeacher>,
  ) {}

  async seed() {
    try {
      console.log('Seeding database...');
      
      // Önce koleksiyonları temizleyelim
      await this.teacherConferenceModel.deleteMany({});
      await this.favoriteTeacherModel.deleteMany({});
      console.log('Collections cleared');

      // Örnek öğretmen konferans verileri
      const teacherConferences = [
        {
          teacherId: new Types.ObjectId().toString(), // MongoDB ObjectId kullanarak benzersiz ID oluşturuyoruz
          firstName: 'Ahmet',
          lastName: 'Yılmaz',
          hobbies: ['Kitap okumak', 'Yüzmek', 'Satranç'],
          isActive: true,
        },
        {
          teacherId: new Types.ObjectId().toString(),
          firstName: 'Ayşe',
          lastName: 'Kaya',
          hobbies: ['Resim yapmak', 'Müzik', 'Doğa yürüyüşü'],
          isActive: true,
        },
        {
          teacherId: new Types.ObjectId().toString(),
          firstName: 'Mehmet',
          lastName: 'Demir',
          hobbies: ['Fotoğrafçılık', 'Seyahat', 'Bisiklet'],
          isActive: true,
        },
        {
          teacherId: new Types.ObjectId().toString(),
          firstName: 'Zeynep',
          lastName: 'Şahin',
          hobbies: ['Yoga', 'Bahçecilik', 'Pişirme'],
          isActive: true,
        },
        {
          teacherId: new Types.ObjectId().toString(),
          firstName: 'Ali',
          lastName: 'Öztürk',
          hobbies: ['Koşu', 'Teknoloji', 'Film izlemek'],
          isActive: true,
        },
      ];

      // Öğretmen konferanslarını ekleyelim
      const savedTeachers = await this.teacherConferenceModel.insertMany(teacherConferences);
      console.log(`${savedTeachers.length} teacher conferences created`);

      // Örnek favori öğretmen verileri (öğrenci ID'leri gerçek değil, örnek olarak kullanıyoruz)
      const favoriteTeachers = [
        {
          studentId: 'student1',
          teacherId: savedTeachers[0]._id,
          isActive: true,
        },
        {
          studentId: 'student1',
          teacherId: savedTeachers[2]._id,
          isActive: true,
        },
        {
          studentId: 'student2',
          teacherId: savedTeachers[1]._id,
          isActive: true,
        },
        {
          studentId: 'student3',
          teacherId: savedTeachers[3]._id,
          isActive: true,
        },
      ];

      // Favori öğretmenleri ekleyelim
      const savedFavorites = await this.favoriteTeacherModel.insertMany(favoriteTeachers);
      console.log(`${savedFavorites.length} favorite teachers created`);
      
      console.log('Seeding completed successfully');
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/teacher_conference_db',
      }),
    }),
    MongooseModule.forFeature([
      { name: TeacherConference.name, schema: TeacherConferenceSchema },
      { name: FavoriteTeacher.name, schema: FavoriteTeacherSchema },
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}

async function bootstrap() {
  const app = await NestFactory.create(SeedModule);
  const seedService = app.get(SeedService);
  await seedService.seed();
  await app.close();
}

bootstrap().then(() => {
  console.log('Seed script completed');
  process.exit(0);
}).catch(error => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
