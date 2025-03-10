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
        
        // Basit isim oluştur
        const firstName = 'Öğretmen';
        const lastName = userDto.id.substring(0, 5);
        
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
            hobbies: [],
            isActive: true
          })
        });

        if (!response.ok) {
          Logger.warn(`Öğretmen konferans kaydı oluşturulamadı: ${await response.text()}`);
        } else {
          Logger.log(`Öğretmen konferans kaydı başarıyla oluşturuldu: ${userDto.id}`);
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
    const payload = {
      id: user.id,
      email: user.email,
      userType: user.userType,
    };
    
    return this.jwtService.sign(payload);
  }
}
