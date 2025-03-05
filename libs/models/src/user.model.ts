import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

export enum UserType {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export class User {
  id: string;
  
  @IsNotEmpty()
  @IsEmail()
  email: string;
  
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
  
  @IsEnum(UserType)
  userType: UserType;
  
  createdAt: Date;
  updatedAt: Date;
}

export class UserDto {
  id: string;
  email: string;
  userType: UserType;
}

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
  
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
  
  @IsEnum(UserType)
  userType: UserType;
}

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
  
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class AuthResponse {
  user: UserDto;
  token: string;
}
