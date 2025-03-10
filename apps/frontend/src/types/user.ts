export enum UserType {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export interface User {
  id: string;
  email: string;
  userType: UserType;
  name?: string; // Kullanıcı adı için opsiyonel alan ekledik
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  userType: UserType;
}
