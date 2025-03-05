import { 
  CreateEnrollmentDto, 
  EnrollmentDto, 
  EnrollmentStatusDto 
} from '@postply/models';

export interface EnrollmentServiceInterface {
  enrollStudent(studentId: string, createEnrollmentDto: CreateEnrollmentDto): Promise<EnrollmentDto>;
  unenrollStudent(studentId: string, enrollmentId: string): Promise<boolean>;
  getStudentEnrollments(studentId: string): Promise<EnrollmentDto[]>;
  getClassEnrollments(classId: string): Promise<EnrollmentDto[]>;
  getEnrollmentStatus(studentId: string, classId: string): Promise<EnrollmentStatusDto>;
}

// API Routes
export const ENROLLMENT_SERVICE_ROUTES = {
  ENROLL_STUDENT: '/enrollments',
  UNENROLL_STUDENT: '/enrollments/:enrollmentId',
  GET_STUDENT_ENROLLMENTS: '/enrollments/student/:studentId',
  GET_CLASS_ENROLLMENTS: '/enrollments/class/:classId',
  GET_ENROLLMENT_STATUS: '/enrollments/status',
};
