import { getAuthHeader } from './authService';

const API_URL = process.env.REACT_APP_VIDEO_CONFERENCE_API_URL || 'http://localhost:3008/api';

export interface VideoSession {
  _id: string;
  teacherId: string;
  studentId: string;
  roomName: string;
  status: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  roomToken?: string;
  createdAt: string;
  updatedAt: string;
}

// Yeni bir video oturumu başlatma
export const createVideoSession = async (teacherId: string, studentId: string): Promise<VideoSession> => {
  try {
    const response = await fetch(`${API_URL}/video-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Public endpoint olduğu için kimlik doğrulama başlığını kaldırdık
      },
      body: JSON.stringify({
        teacherId,
        studentId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Error creating video session:', error);
    throw new Error(error.message || 'Failed to create video session');
  }
};

// Öğretmenin bekleyen görüşmelerini getirme
export const getTeacherPendingSessions = async (teacherId: string): Promise<VideoSession[]> => {
  try {
    const response = await fetch(`${API_URL}/video-sessions/teacher/${teacherId}/pending`, {
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Error fetching pending sessions:', error);
    throw new Error(error.message || 'Failed to fetch pending sessions');
  }
};

// Kullanıcının tüm görüşmelerini getirme
export const getUserSessions = async (): Promise<VideoSession[]> => {
  try {
    const response = await fetch(`${API_URL}/video-sessions`, {
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Error fetching user sessions:', error);
    throw new Error(error.message || 'Failed to fetch user sessions');
  }
};

// Belirli bir görüşmeyi getirme
export const getVideoSession = async (sessionId: string): Promise<VideoSession> => {
  try {
    const response = await fetch(`${API_URL}/video-sessions/${sessionId}`, {
      // Public endpoint olduğu için kimlik doğrulama başlığını kaldırdık
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Error fetching video session:', error);
    throw new Error(error.message || 'Failed to fetch video session');
  }
};

// Görüşme başlatma
export const startVideoSession = async (
  sessionId: string, 
  teacherName: string,
  studentName: string = 'Öğrenci' // Öğrenci adı opsiyonel, varsayılan değer 'Öğrenci'
): Promise<VideoSession> => {
  try {
    const response = await fetch(
      `${API_URL}/video-sessions/${sessionId}/start?teacherName=${encodeURIComponent(teacherName)}&studentName=${encodeURIComponent(studentName)}`,
      {
        method: 'PUT',
        // Public endpoint olduğu için kimlik doğrulama başlığını kaldırdık
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Error starting video session:', error);
    throw new Error(error.message || 'Failed to start video session');
  }
};

// Öğrenci için token alma
export const getStudentToken = async (sessionId: string, studentName: string): Promise<string> => {
  try {
    const response = await fetch(
      `${API_URL}/video-sessions/${sessionId}/student-token?studentName=${encodeURIComponent(studentName)}`,
      {
        // Public endpoint olduğu için kimlik doğrulama başlığını kaldırdık
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.token;
  } catch (error: any) {
    console.error('Error getting student token:', error);
    throw new Error(error.message || 'Failed to get student token');
  }
};

// Görüşmeyi tamamlama
export const completeVideoSession = async (sessionId: string): Promise<VideoSession> => {
  try {
    const response = await fetch(`${API_URL}/video-sessions/${sessionId}/complete`, {
      method: 'PUT',
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Error completing video session:', error);
    throw new Error(error.message || 'Failed to complete video session');
  }
};

// Görüşmeyi iptal etme
export const cancelVideoSession = async (sessionId: string): Promise<VideoSession> => {
  try {
    const response = await fetch(`${API_URL}/video-sessions/${sessionId}/cancel`, {
      method: 'PUT',
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Error canceling video session:', error);
    throw new Error(error.message || 'Failed to cancel video session');
  }
};
