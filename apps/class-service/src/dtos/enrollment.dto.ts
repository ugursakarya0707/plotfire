import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @IsUUID()
  @IsOptional()
  studentId?: string; // Optional because it can be set from the JWT token
}

export class UpdateEnrollmentDto {
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
