import axios from 'axios';
import { User, UserType, AuthResponse } from '../types/user';

// Use environment variable with fallback
const API_URL = process.env['REACT_APP_API_URL'] || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle session expiration
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  console.log('Token from localStorage:', token);
  
  // Eğer token localStorage'da doğrudan yoksa, user nesnesinden almayı dene
  if (!token) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.token) {
          console.log('Token found in user object');
          return {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          };
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
  }
  
  return {
    Authorization: token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
};

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to login');
  }
};

export const registerUser = async (
  email: string,
  password: string,
  userType: UserType
): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      userType,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to register');
  }
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get<User>('/auth/user');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to get current user');
  }
};

export const logoutUser = (): void => {
  // Client-side logout only
  localStorage.removeItem('token');
};
