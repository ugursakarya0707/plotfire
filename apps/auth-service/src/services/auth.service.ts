import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto, LoginDto, AuthResponse, UserDto } from '@postply/models';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    
    const user = await this.userRepository.create(createUserDto);
    const userDto = this.userRepository.mapToDto(user);
    const token = this.generateToken(userDto);
    
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
