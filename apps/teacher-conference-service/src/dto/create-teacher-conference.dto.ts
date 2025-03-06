import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
