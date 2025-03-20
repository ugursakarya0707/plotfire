import { Profile, ProfileUpdateDto } from '../types/profile';
import { getAuthHeader } from './authService';
import { UserType } from '../types/user';

const API_URL = process.env['REACT_APP_PROFILE_API_URL'] || 'http://localhost:3003/api';
const TEACHER_CONFERENCE_API_URL = process.env['REACT_APP_TEACHER_CONFERENCE_API_URL'] || 'http://localhost:3006/api';

export const getProfile = async (): Promise<Profile> => {
  try {
    const response = await fetch(`${API_URL}/profiles/me`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch profile');
  }
};

export const getProfileById = async (id: string): Promise<Profile> => {
  try {
    const response = await fetch(`${API_URL}/profiles/${id}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching profile with ID ${id}:`, error);
    throw error;
  }
};

export const getProfileByUserId = async (userId: string): Promise<Profile> => {
  try {
    const response = await fetch(`${API_URL}/profiles/user/${userId}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching profile for user with ID ${userId}:`, error);
    throw error;
  }
};

// Öğretmen konferans bilgilerini güncelleme fonksiyonu
const updateTeacherConference = async (teacherId: string, profileData: ProfileUpdateDto): Promise<void> => {
  try {
    // Önce öğretmen konferans bilgilerini getir
    const teacherResponse = await fetch(`${TEACHER_CONFERENCE_API_URL}/teacher-conferences/teacher/${teacherId}`, {
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    if (!teacherResponse.ok) {
      console.error('Öğretmen konferans bilgileri bulunamadı. Yeni kayıt oluşturulacak.');
      // Eğer öğretmen konferans kaydı yoksa, yeni oluştur
      await fetch(`${TEACHER_CONFERENCE_API_URL}/teacher-conferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeader() as Record<string, string>)
        },
        body: JSON.stringify({
          teacherId,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          hobbies: profileData.interests || [],
          isActive: true,
          subject: profileData.subject,
          hourlyRate: profileData.hourlyRate,
          bio: profileData.bio
        })
      });
      return;
    }
    
    // Öğretmen konferans bilgilerini al
    const teacherData = await teacherResponse.json();
    
    // Öğretmen konferans bilgilerini güncelle
    await fetch(`${TEACHER_CONFERENCE_API_URL}/teacher-conferences/${teacherData._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>)
      },
      body: JSON.stringify({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        hobbies: profileData.interests || [],
        subject: profileData.subject,
        hourlyRate: profileData.hourlyRate,
        bio: profileData.bio
      })
    });
    
    console.log('Öğretmen konferans bilgileri başarıyla güncellendi.');
  } catch (error) {
    console.error('Öğretmen konferans bilgileri güncellenirken hata oluştu:', error);
    throw error;
  }
};

export const updateProfile = async (profileData: ProfileUpdateDto): Promise<Profile> => {
  try {
    // If we have an ID, update the existing profile
    if (profileData.id) {
      const response = await fetch(`${API_URL}/profiles/${profileData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeader() as Record<string, string>)
        },
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      
      // Eğer kullanıcı bir öğretmense ve ders bilgileri varsa, öğretmen konferans bilgilerini de güncelle
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.userType === UserType.TEACHER && (profileData.subject || profileData.hourlyRate)) {
        await updateTeacherConference(user.id, profileData);
      }
      
      return await response.json();
    } 
    // Otherwise create a new profile
    else {
      const response = await fetch(`${API_URL}/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeader() as Record<string, string>)
        },
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      
      return await response.json();
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update profile');
  }
};

export const createProfile = async (profileData: ProfileUpdateDto): Promise<Profile> => {
  try {
    const response = await fetch(`${API_URL}/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>)
      },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
};
