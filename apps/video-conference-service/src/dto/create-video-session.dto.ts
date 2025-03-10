import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateVideoSessionDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsOptional()
  roomName?: string; // Opsiyonel, servis tarafında otomatik oluşturulabilir

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;
}
