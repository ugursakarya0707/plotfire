import { 
  StudentProfile, 
  TeacherProfile, 
  UpdateProfileDto 
} from '@postply/models';

export interface ProfileServiceInterface {
  getStudentProfile(studentId: string): Promise<StudentProfile>;
  getTeacherProfile(teacherId: string): Promise<TeacherProfile>;
  updateStudentProfile(studentId: string, updateProfileDto: UpdateProfileDto): Promise<StudentProfile>;
  updateTeacherProfile(teacherId: string, updateProfileDto: UpdateProfileDto): Promise<TeacherProfile>;
  uploadProfilePhoto(userId: string, file: any): Promise<{ photoUrl: string }>;
}

// API Routes
export const PROFILE_SERVICE_ROUTES = {
  GET_STUDENT_PROFILE: '/profiles/student/:studentId',
  GET_TEACHER_PROFILE: '/profiles/teacher/:teacherId',
  UPDATE_STUDENT_PROFILE: '/profiles/student/:studentId',
  UPDATE_TEACHER_PROFILE: '/profiles/teacher/:teacherId',
  UPLOAD_PROFILE_PHOTO: '/profiles/upload-photo',
};
