import axios from 'axios';
import { Profile, ProfileUpdateDto } from '../types/profile';
import { getAuthHeader } from './authService';

const API_URL = process.env['REACT_APP_PROFILE_API_URL'] || 'http://localhost:3003/api';

export const getProfile = async (): Promise<Profile> => {
  try {
    const response = await axios.get(`${API_URL}/profiles/me`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch profile');
  }
};

export const getProfileById = async (id: string): Promise<Profile> => {
  try {
    const response = await axios.get(`${API_URL}/profiles/${id}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching profile with ID ${id}:`, error);
    throw error;
  }
};

export const getProfileByUserId = async (userId: string): Promise<Profile> => {
  try {
    const response = await axios.get(`${API_URL}/profiles/user/${userId}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching profile for user with ID ${userId}:`, error);
    throw error;
  }
};

export const updateProfile = async (profileData: ProfileUpdateDto): Promise<Profile> => {
  try {
    // If we have an ID, update the existing profile
    if (profileData.id) {
      const response = await axios.put(`${API_URL}/profiles/${profileData.id}`, profileData, {
        headers: getAuthHeader(),
      });
      return response.data;
    } 
    // Otherwise create a new profile
    else {
      const response = await axios.post(`${API_URL}/profiles`, profileData, {
        headers: getAuthHeader(),
      });
      return response.data;
    }
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update profile');
  }
};

export const createProfile = async (profileData: ProfileUpdateDto): Promise<Profile> => {
  try {
    const response = await axios.post(`${API_URL}/profiles`, profileData, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
};
