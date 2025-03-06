import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFavoriteTeacherDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;
}
