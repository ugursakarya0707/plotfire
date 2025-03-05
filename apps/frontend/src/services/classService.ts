import axios from 'axios';
import { Class, Enrollment } from '../types/class';
import { getAuthHeader } from './authService';

// Use environment variable with fallback
const API_URL = process.env['REACT_APP_CLASS_API_URL'] || 'http://localhost:3002/api';

// Class API functions
export const getClasses = async (): Promise<Class[]> => {
  try {
    const response = await axios.get<Class[]>(`${API_URL}/classes`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch classes');
  }
};

export const getClassById = async (id: string): Promise<Class> => {
  try {
    const response = await axios.get<Class>(`${API_URL}/classes/${id}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch class');
  }
};

export const getClassesByTeacherId = async (teacherId: string): Promise<Class[]> => {
  try {
    const response = await axios.get<Class[]>(`${API_URL}/classes/teacher/${teacherId}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch teacher classes');
  }
};

export const createClass = async (classData: Partial<Class>): Promise<Class> => {
  try {
    const response = await axios.post<Class>(`${API_URL}/classes`, classData, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create class');
  }
};

export const updateClass = async (id: string, classData: Partial<Class>): Promise<Class> => {
  try {
    const response = await axios.put<Class>(`${API_URL}/classes/${id}`, classData, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update class');
  }
};

export const deleteClass = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/classes/${id}`, {
      headers: getAuthHeader(),
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete class');
  }
};

// Enrollment API functions
export const getEnrollments = async (): Promise<Enrollment[]> => {
  try {
    const response = await axios.get<Enrollment[]>(`${API_URL}/enrollments`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch enrollments');
  }
};

export const getEnrollmentById = async (id: string): Promise<Enrollment> => {
  try {
    const response = await axios.get<Enrollment>(`${API_URL}/enrollments/${id}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch enrollment');
  }
};

export const getEnrollmentsByStudentId = async (studentId: string): Promise<Enrollment[]> => {
  try {
    const response = await axios.get<Enrollment[]>(`${API_URL}/enrollments/student/${studentId}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch student enrollments');
  }
};

export const getEnrollmentsByClassId = async (classId: string): Promise<Enrollment[]> => {
  try {
    const response = await axios.get<Enrollment[]>(`${API_URL}/enrollments/class/${classId}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch class enrollments');
  }
};

export const enrollInClass = async (classId: string): Promise<Enrollment> => {
  try {
    const response = await axios.post<Enrollment>(`${API_URL}/enrollments`, { classId }, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to enroll in class');
  }
};

export const updateEnrollment = async (id: string, enrollmentData: Partial<Enrollment>): Promise<Enrollment> => {
  try {
    const response = await axios.put<Enrollment>(`${API_URL}/enrollments/${id}`, enrollmentData, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update enrollment');
  }
};

export const deleteEnrollment = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/enrollments/${id}`, {
      headers: getAuthHeader(),
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete enrollment');
  }
};
