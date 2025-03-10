import { getAuthHeader } from './authService';

const API_URL = process.env['REACT_APP_TEACHER_CONFERENCE_API_URL'] || 'http://localhost:3006/api';

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
    const response = await fetch(`${API_URL}/teacher-conferences`, {
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Error fetching teacher conferences:', error);
    throw new Error(error.message || 'Failed to fetch teacher conferences');
  }
};

// Get teacher conference by ID
export const getTeacherConferenceById = async (id: string): Promise<TeacherConference> => {
  try {
    const response = await fetch(`${API_URL}/teacher-conferences/${id}`, {
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Error fetching teacher conference:', error);
    throw new Error(error.message || 'Failed to fetch teacher conference');
  }
};

// Get teacher conference by teacher ID
export const getTeacherConferenceByTeacherId = async (teacherId: string): Promise<TeacherConference> => {
  try {
    const response = await fetch(`${API_URL}/teacher-conferences/teacher/${teacherId}`, {
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Error fetching teacher conference by teacher ID:', error);
    throw new Error(error.message || 'Failed to fetch teacher conference');
  }
};

// Add teacher to favorites
export const addTeacherToFavorites = async (teacherId: string): Promise<FavoriteTeacher> => {
  try {
    const response = await fetch(`${API_URL}/favorite-teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>)
      },
      body: JSON.stringify({ teacherId }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Error adding teacher to favorites:', error);
    throw new Error(error.message || 'Failed to add teacher to favorites');
  }
};

// Remove teacher from favorites
export const removeTeacherFromFavorites = async (teacherId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/favorite-teachers/${teacherId}`, {
      method: 'DELETE',
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error removing teacher from favorites:', error);
    throw new Error(error.message || 'Failed to remove teacher from favorites');
  }
};

// Get favorite teachers
export const getFavoriteTeachers = async (): Promise<FavoriteTeacher[]> => {
  try {
    const response = await fetch(`${API_URL}/favorite-teachers`, {
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Error fetching favorite teachers:', error);
    throw new Error(error.message || 'Failed to fetch favorite teachers');
  }
};

// Check if teacher is favorite
export const isTeacherFavorite = async (teacherId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/favorite-teachers/check/${teacherId}`, {
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.isFavorite;
  } catch (error: any) {
    console.error('Error checking if teacher is favorite:', error);
    return false;
  }
};
