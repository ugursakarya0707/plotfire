import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class Question {
  id: string;
  
  @IsNotEmpty()
  @IsUUID()
  classId: string;
  
  @IsNotEmpty()
  @IsUUID()
  studentId: string;
  
  @IsNotEmpty()
  @IsString()
  content: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export class QuestionDto {
  id: string;
  classId: string;
  studentId: string;
  studentName?: string;
  content: string;
  answers?: AnswerDto[];
  createdAt: Date;
}

export class CreateQuestionDto {
  @IsNotEmpty()
  @IsUUID()
  classId: string;
  
  @IsNotEmpty()
  @IsString()
  content: string;
}

export class Answer {
  id: string;
  
  @IsNotEmpty()
  @IsUUID()
  questionId: string;
  
  @IsNotEmpty()
  @IsUUID()
  teacherId: string;
  
  @IsNotEmpty()
  @IsString()
  content: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export class AnswerDto {
  id: string;
  questionId: string;
  teacherId: string;
  teacherName?: string;
  content: string;
  createdAt: Date;
}

export class CreateAnswerDto {
  @IsNotEmpty()
  @IsUUID()
  questionId: string;
  
  @IsNotEmpty()
  @IsString()
  content: string;
}
