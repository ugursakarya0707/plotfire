import * as mongoose from 'mongoose';
import { config } from 'dotenv';
import { Types } from 'mongoose';

// .env dosyasını yükle
config();

// MongoDB bağlantı URI'si
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/teacher_conference_db';

// Şema tanımları
const teacherConferenceSchema = new mongoose.Schema(
  {
    teacherId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    hobbies: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const favoriteTeacherSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    teacherId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'TeacherConference',
      required: true 
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Model oluşturma
const TeacherConference = mongoose.model('TeacherConference', teacherConferenceSchema);
const FavoriteTeacher = mongoose.model('FavoriteTeacher', favoriteTeacherSchema);

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Seeding database...');
    
    // Koleksiyonları temizle
    await TeacherConference.deleteMany({});
    await FavoriteTeacher.deleteMany({});
    console.log('Collections cleared');

    // Örnek öğretmen konferans verileri
    const teacherConferences = [
      {
        teacherId: new Types.ObjectId().toString(),
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

    // Öğretmen konferanslarını ekle
    const savedTeachers = await TeacherConference.insertMany(teacherConferences);
    console.log(`${savedTeachers.length} teacher conferences created`);

    // Örnek favori öğretmen verileri
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

    // Favori öğretmenleri ekle
    const savedFavorites = await FavoriteTeacher.insertMany(favoriteTeachers);
    console.log(`${savedFavorites.length} favorite teachers created`);
    
    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // MongoDB bağlantısını kapat
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Seed işlemini başlat
seed().then(() => {
  console.log('Seed script completed');
  process.exit(0);
}).catch(error => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
