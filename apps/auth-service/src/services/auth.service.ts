import { Injectable, UnauthorizedException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto, LoginDto, AuthResponse, UserDto, UserType } from '@postply/models';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    
    const user = await this.userRepository.create(createUserDto);
    const userDto = this.userRepository.mapToDto(user);
    const token = this.generateToken(userDto);
    
    // Öğretmen kaydı ise teacher-conference-service'e HTTP isteği gönder
    if (userDto.userType === UserType.TEACHER) {
      try {
        const teacherConferenceApiUrl = this.configService.get<string>('TEACHER_CONFERENCE_API_URL') || 'http://localhost:3006/api';
        
        // Rastgele ders konuları
        const subjects = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'İngilizce', 'Tarih', 'Coğrafya'];
        const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
        
        // Rastgele saatlik ücret (3000-8000 TL arası)
        const randomHourlyRate = Math.floor(Math.random() * 5000) + 3000;
        
        // Rastgele hobiler
        const hobbies = [
          'Kitap okumak', 'Yüzme', 'Satranç', 'Müzik', 'Resim', 'Tiyatro', 
          'Seyahat', 'Fotoğrafçılık', 'Bahçecilik', 'Yemek yapmak', 'Koşu', 'Yoga'
        ];
        const randomHobbies = [];
        const hobbyCount = Math.floor(Math.random() * 4) + 1; // 1-4 arası hobi
        
        for (let i = 0; i < hobbyCount; i++) {
          const randomIndex = Math.floor(Math.random() * hobbies.length);
          randomHobbies.push(hobbies[randomIndex]);
          hobbies.splice(randomIndex, 1); // Aynı hobinin tekrar seçilmemesi için
        }
        
        // Rastgele isim ve soyisim oluştur
        const firstNames = ['Ali', 'Ayşe', 'Mehmet', 'Fatma', 'Ahmet', 'Zeynep', 'Mustafa', 'Emine', 'Hasan', 'Hatice'];
        const lastNames = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan'];
        
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        // Biyografi oluştur
        const bios = [
          `${randomSubject} alanında deneyimli öğretmen. Öğrencilere özel ders vermektedir.`,
          `${randomSubject} öğretmeni olarak 5 yıllık deneyime sahibim. Öğrencilerin başarısı için özel teknikler kullanıyorum.`,
          `${randomSubject} derslerinde öğrencilerin seviyesine göre özel programlar hazırlıyorum.`,
          `${randomSubject} konusunda uzmanlaşmış, öğrenci odaklı bir öğretmenim.`
        ];
        const randomBio = bios[Math.floor(Math.random() * bios.length)];
        
        // Rastgele fotoğraf URL'si
        const gender = Math.random() > 0.5 ? 'men' : 'women';
        const photoIndex = Math.floor(Math.random() * 99) + 1;
        const photoUrl = `https://randomuser.me/api/portraits/${gender}/${photoIndex}.jpg`;
        
        // Teacher conference kaydı oluştur
        const response = await fetch(`${teacherConferenceApiUrl}/teacher-conferences`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            teacherId: userDto.id,
            firstName,
            lastName,
            hobbies: randomHobbies,
            isActive: true,
            subject: randomSubject,
            hourlyRate: randomHourlyRate,
            rating: 4.5,
            ratingCount: Math.floor(Math.random() * 20) + 1,
            photoUrl: photoUrl,
            bio: randomBio
          })
        });

        if (!response.ok) {
          Logger.warn(`Öğretmen konferans kaydı oluşturulamadı: ${await response.text()}`);
        } else {
          Logger.log(`Öğretmen konferans kaydı başarıyla oluşturuldu: ${userDto.id}`);
          
          // Öğretmen için zaman dilimleri oluştur
          await this.createTimeSlots(teacherConferenceApiUrl, userDto.id, token);
        }
      } catch (error) {
        Logger.error(`Öğretmen konferans kaydı oluşturulurken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      }
    }
    
    return {
      user: userDto,
      token,
    };
  }

  // Öğretmen için zaman dilimleri oluşturan yardımcı metod
  private async createTimeSlots(apiUrl: string, teacherId: string, token: string): Promise<void> {
    try {
      const today = new Date();
      
      // Önümüzdeki 7 gün için zaman dilimleri oluştur
      for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Günde 3 zaman dilimi oluştur (sabah, öğleden sonra, akşam)
        const timeSlots = [
          {
            teacherId,
            date: dateString,
            startTime: new Date(`${dateString}T09:00:00`).toISOString(),
            endTime: new Date(`${dateString}T10:00:00`).toISOString(),
            isBooked: false
          },
          {
            teacherId,
            date: dateString,
            startTime: new Date(`${dateString}T14:00:00`).toISOString(),
            endTime: new Date(`${dateString}T15:00:00`).toISOString(),
            isBooked: false
          },
          {
            teacherId,
            date: dateString,
            startTime: new Date(`${dateString}T18:00:00`).toISOString(),
            endTime: new Date(`${dateString}T19:00:00`).toISOString(),
            isBooked: false
          }
        ];
        
        // Her zaman dilimi için ayrı istek gönder
        for (const slot of timeSlots) {
          try {
            const response = await fetch(`${apiUrl}/teacher-time-slots`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(slot)
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              Logger.warn(`Zaman dilimi oluşturulamadı: Status ${response.status}, Response: ${errorText}`);
            }
          } catch (slotError) {
            Logger.error(`Zaman dilimi oluşturulurken hata: ${slotError instanceof Error ? slotError.message : 'Bilinmeyen hata'}`);
          }
        }
      }
      
      Logger.log(`Öğretmen ${teacherId} için zaman dilimleri oluşturuldu`);
    } catch (error) {
      Logger.error(`Zaman dilimleri oluşturulurken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(loginDto.email);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const isPasswordValid = await user.comparePassword(loginDto.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const userDto = this.userRepository.mapToDto(user);
    const token = this.generateToken(userDto);
    
    return {
      user: userDto,
      token,
    };
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      this.jwtService.verify(token);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUserFromToken(token: string): Promise<UserDto> {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.userRepository.findById(decoded.id);
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      return this.userRepository.mapToDto(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private generateToken(user: UserDto): string {
    // any tipini kullanarak TypeScript hatalarını önleyelim
    const userAny = user as any;
    
    const payload = {
      id: user.id,
      email: user.email,
      userType: user.userType,
    };
    
    // Opsiyonel alanları koşullu olarak ekle
    if (userAny.firstName) {
      payload['firstName'] = userAny.firstName;
    }
    
    if (userAny.lastName) {
      payload['lastName'] = userAny.lastName;
    }
    
    if (userAny.username) {
      payload['username'] = userAny.username;
    }
    
    return this.jwtService.sign(payload);
  }

  async getUserById(id: string): Promise<UserDto | null> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      return null;
    }
    return this.userRepository.mapToDto(user);
  }
}
