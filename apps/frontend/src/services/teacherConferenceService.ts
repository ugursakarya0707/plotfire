import { getAuthHeader } from './authService';

const API_URL = process.env['REACT_APP_TEACHER_CONFERENCE_API_URL'] || 'http://localhost:3006/api';

export interface TeacherConference {
  _id: string;
  id?: string; 
  teacherId: string;
  firstName: string;
  lastName: string;
  name?: string; 
  hobbies: string[];
  isActive: boolean;
  isOnline: boolean;
  subject?: string;
  hourlyRate?: number;
  rating?: number;
  ratingCount?: number;
  photoUrl?: string;
  bio?: string;
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
    const data = await response.json();
    return data.map((teacher: TeacherConference) => ({
      ...teacher,
      id: teacher._id, 
      name: `${teacher.firstName} ${teacher.lastName}` 
    }));
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
    const data = await response.json();
    return {
      ...data,
      id: data._id, 
      name: `${data.firstName} ${data.lastName}` 
    };
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
    const data = await response.json();
    return {
      ...data,
      id: data._id, 
      name: `${data.firstName} ${data.lastName}` 
    };
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

// Update teacher's online status
export const updateTeacherOnlineStatus = async (isOnline: boolean): Promise<TeacherConference> => {
  try {
    console.log('Updating teacher online status:', isOnline);
    
    // User bilgisini localStorage'dan al
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      throw new Error('User not found in localStorage');
    }
    
    const user = JSON.parse(userStr);
    const token = user.token || localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    console.log('Using token:', token.substring(0, 20) + '...');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    console.log('Request headers:', headers);
    
    // TeacherId parametresini URL'de kullanmıyoruz, backend kullanıcının JWT token'ından ID'sini alacak
    const response = await fetch(`${API_URL}/teacher-conferences/teacher/me/online-status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ isOnline }),
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response data:', errorData);
      throw new Error(`Failed to update online status: ${errorData.message || `HTTP error! status: ${response.status}`}`);
    }
    
    const data = await response.json();
    console.log('Success response data:', data);
    return {
      ...data,
      id: data._id,
      name: `${data.firstName} ${data.lastName}`
    };
  } catch (error: any) {
    console.error('Error updating teacher online status:', error);
    throw error;
  }
};
