import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Kullanıcı tipleri için enum
export enum UserType {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

// Kullanıcı arayüzü
export interface User {
  id: string;
  username: string;
  email: string;
  userType: UserType;
  token?: string;
}

// Auth context arayüzü
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

// Auth context'i oluşturma
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider bileşeni
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sayfa yüklendiğinde local storage'dan kullanıcı bilgilerini alma
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Token'ı axios default headers'a ekle
          if (parsedUser.token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login fonksiyonu
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // API'ye login isteği gönderme
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/auth/login`, {
        email,
        password,
      });
      
      const userData: User = response.data;
      
      // Kullanıcı bilgilerini state'e ve local storage'a kaydetme
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Token'ı axios default headers'a ekle
      if (userData.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout fonksiyonu
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Kullanıcının authenticate olup olmadığını kontrol etme
  const isAuthenticated = () => {
    return !!user;
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// useAuth hook'u
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth service
export const getAuthHeader = () => {
  const user = localStorage.getItem('user');
  if (user) {
    const parsedUser = JSON.parse(user);
    if (parsedUser.token) {
      return { Authorization: `Bearer ${parsedUser.token}` };
    }
  }
  return {};
};
