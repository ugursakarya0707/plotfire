import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class BaseProfile {
  id: string;
  userId: string;
  
  @IsNotEmpty()
  @IsString()
  name: string;
  
  @IsOptional()
  @IsNumber()
  @Min(0)
  age?: number;
  
  @IsOptional()
  @IsString()
  school?: string;
  
  @IsOptional()
  @IsString()
  photoUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export class StudentProfile extends BaseProfile {
  // Student-specific fields can be added here
  @IsOptional()
  @IsString()
  major?: string;
  
  @IsOptional()
  @IsNumber()
  yearOfStudy?: number;
}

export class TeacherProfile extends BaseProfile {
  // Teacher-specific fields can be added here
  @IsOptional()
  @IsString()
  department?: string;
  
  @IsOptional()
  @IsString()
  specialization?: string;
  
  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;
  
  @IsOptional()
  @IsNumber()
  @Min(0)
  age?: number;
  
  @IsOptional()
  @IsString()
  school?: string;
  
  @IsOptional()
  @IsString()
  photoUrl?: string;
  
  // Additional fields based on profile type
  @IsOptional()
  @IsString()
  major?: string;
  
  @IsOptional()
  @IsNumber()
  yearOfStudy?: number;
  
  @IsOptional()
  @IsString()
  department?: string;
  
  @IsOptional()
  @IsString()
  specialization?: string;
  
  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;
}
