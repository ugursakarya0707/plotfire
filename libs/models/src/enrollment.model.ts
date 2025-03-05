import { IsNotEmpty, IsUUID } from 'class-validator';

export class Enrollment {
  id: string;
  
  @IsNotEmpty()
  @IsUUID()
  classId: string;
  
  @IsNotEmpty()
  @IsUUID()
  studentId: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export class EnrollmentDto {
  id: string;
  classId: string;
  className?: string;
  studentId: string;
  studentName?: string;
  createdAt: Date;
}

export class CreateEnrollmentDto {
  @IsNotEmpty()
  @IsUUID()
  classId: string;
}

export class EnrollmentStatusDto {
  enrolled: boolean;
  enrollmentId?: string;
}
