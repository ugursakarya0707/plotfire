import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum VideoSessionStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class UpdateVideoSessionDto {
  @IsEnum(VideoSessionStatus)
  @IsOptional()
  status?: VideoSessionStatus;

  @IsString()
  @IsOptional()
  roomToken?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;
}
