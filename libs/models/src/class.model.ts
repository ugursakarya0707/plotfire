import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { QuestionDto } from './qa.model';

export class Class {
  id: string;
  
  @IsNotEmpty()
  @IsString()
  name: string;
  
  @IsNotEmpty()
  @IsString()
  description: string;
  
  @IsNotEmpty()
  @IsUUID()
  teacherId: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export class CreateClassDto {
  @IsNotEmpty()
  @IsString()
  name: string;
  
  @IsNotEmpty()
  @IsString()
  description: string;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  name?: string;
  
  @IsOptional()
  @IsString()
  description?: string;
}

export class ClassDto {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  teacherName?: string;
  enrolledStudentsCount?: number;
  createdAt: Date;
}

export class ClassDetailDto extends ClassDto {
  materials?: ClassMaterialDto[];
  questions?: QuestionDto[];
}

export class ClassMaterial {
  id: string;
  
  @IsNotEmpty()
  @IsUUID()
  classId: string;
  
  @IsNotEmpty()
  @IsString()
  title: string;
  
  @IsNotEmpty()
  @IsString()
  description: string;
  
  @IsNotEmpty()
  @IsString()
  fileUrl: string;
  
  @IsNotEmpty()
  @IsString()
  fileType: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export class ClassMaterialDto {
  id: string;
  classId: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  createdAt: Date;
}

export class CreateClassMaterialDto {
  @IsNotEmpty()
  @IsString()
  title: string;
  
  @IsNotEmpty()
  @IsString()
  description: string;
  
  // File will be handled separately in the controller
}
