import axios from 'axios';
import { getAuthHeader } from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3006/api';

export interface TeacherConference {
  _id: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  hobbies: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteTeacher {
  _id: string;
  studentId: string;
  teacherId: TeacherConference;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Get all teacher conferences
export const getAllTeacherConferences = async (): Promise<TeacherConference[]> => {
  try {
    const response = await axios.get<TeacherConference[]>(`${API_URL}/teacher-conferences`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching teacher conferences:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch teacher conferences');
  }
};

// Get teacher conference by ID
export const getTeacherConferenceById = async (id: string): Promise<TeacherConference> => {
  try {
    const response = await axios.get<TeacherConference>(`${API_URL}/teacher-conferences/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching teacher conference:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch teacher conference');
  }
};

// Get teacher conference by teacher ID
export const getTeacherConferenceByTeacherId = async (teacherId: string): Promise<TeacherConference> => {
  try {
    const response = await axios.get<TeacherConference>(`${API_URL}/teacher-conferences/teacher/${teacherId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching teacher conference by teacher ID:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch teacher conference');
  }
};

// Add teacher to favorites
export const addTeacherToFavorites = async (teacherId: string): Promise<FavoriteTeacher> => {
  try {
    const response = await axios.post<FavoriteTeacher>(
      `${API_URL}/favorite-teachers`,
      { teacherId },
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error adding teacher to favorites:', error);
    throw new Error(error.response?.data?.message || 'Failed to add teacher to favorites');
  }
};

// Remove teacher from favorites
export const removeTeacherFromFavorites = async (teacherId: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/favorite-teachers/${teacherId}`, {
      headers: getAuthHeader(),
    });
  } catch (error: any) {
    console.error('Error removing teacher from favorites:', error);
    throw new Error(error.response?.data?.message || 'Failed to remove teacher from favorites');
  }
};

// Get favorite teachers
export const getFavoriteTeachers = async (): Promise<FavoriteTeacher[]> => {
  try {
    const response = await axios.get<FavoriteTeacher[]>(`${API_URL}/favorite-teachers`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching favorite teachers:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch favorite teachers');
  }
};

// Check if teacher is favorite
export const isTeacherFavorite = async (teacherId: string): Promise<boolean> => {
  try {
    const response = await axios.get<{ isFavorite: boolean }>(
      `${API_URL}/favorite-teachers/check/${teacherId}`,
      { headers: getAuthHeader() }
    );
    return response.data.isFavorite;
  } catch (error: any) {
    console.error('Error checking if teacher is favorite:', error);
    return false;
  }
};
