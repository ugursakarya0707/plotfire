import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTeacherConferenceDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hobbies?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
  
  @IsString()
  @IsOptional()
  subject?: string;
  
  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;
  
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  rating?: number;
  
  @IsNumber()
  @IsOptional()
  @Min(0)
  ratingCount?: number;
  
  @IsString()
  @IsOptional()
  photoUrl?: string;
  
  @IsString()
  @IsOptional()
  bio?: string;
}
