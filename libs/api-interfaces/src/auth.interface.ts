import { CreateUserDto, LoginDto, AuthResponse } from '@postply/models';

export interface AuthServiceInterface {
  register(createUserDto: CreateUserDto): Promise<AuthResponse>;
  login(loginDto: LoginDto): Promise<AuthResponse>;
  validateToken(token: string): Promise<boolean>;
  getUserFromToken(token: string): Promise<any>;
}

// API Routes
export const AUTH_SERVICE_ROUTES = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  VALIDATE_TOKEN: '/auth/validate-token',
  GET_USER: '/auth/user',
};
