import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { CreateUserDto, UserDto } from '@postply/models';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  mapToDto(user: UserEntity): UserDto {
    // Temel UserDto alanlarını döndür
    const result = {
      id: user.id,
      email: user.email,
      userType: user.userType,
    } as UserDto;
    
    // any tipini kullanarak TypeScript hatalarını önleyelim
    const resultAny = result as any;
    
    // firstName ve lastName alanlarını ekle
    if (user.firstName) {
      resultAny.firstName = user.firstName;
    }
    
    if (user.lastName) {
      resultAny.lastName = user.lastName;
    }
    
    // Username alanını ekle
    resultAny.username = (user.firstName && user.lastName) 
      ? `${user.firstName} ${user.lastName}` 
      : 'Anonim Kullanıcı';
    
    return result;
  }
}
