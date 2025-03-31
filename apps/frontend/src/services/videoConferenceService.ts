import { getAuthHeader } from './authService';
import { VIDEO_CONFERENCE_API_URL } from '../config';

// Yeni bir video oturumu başlatma
export const createVideoSession = async (teacherId: string, studentId: string): Promise<VideoSession> => {
  try {
    console.log(`Creating video session with teacherId: ${teacherId}, studentId: ${studentId}`);
    
    // İstek gövdesi
    const requestBody = {
      teacherId,
      studentId,
      // status alanını kaldırdık çünkü backend bunu kabul etmiyor
    };
    
    console.log('Request body:', requestBody);
    
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Public endpoint olduğu için kimlik doğrulama başlığını kaldırdık
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Created video session:', data);
    return data;
  } catch (error: any) {
    console.error('Error creating video session:', error);
    throw new Error(error.message || 'Failed to create video session');
  }
};

// Öğretmen için bekleyen görüşmeleri getir (PendingVideoSessions bileşeni için)
export const getTeacherPendingSessions = async (teacherId: string): Promise<VideoSession[]> => {
  try {
    console.log(`Getting pending sessions for teacher: ${teacherId}`);
    // Gelişmiş checkPendingSessionsForTeacher fonksiyonunu kullan
    return await checkPendingSessionsForTeacher(teacherId);
  } catch (error: any) {
    console.error('Error getting pending sessions for teacher:', error);
    throw new Error(error.message || 'Failed to get pending sessions for teacher');
  }
};

// Kullanıcının tüm görüşmelerini getirme
export const getUserSessions = async (): Promise<VideoSession[]> => {
  try {
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions`, {
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

// Öğretmen için bekleyen görüşmeleri kontrol et
export const checkPendingSessionsForTeacher = async (teacherId: string): Promise<VideoSession[]> => {
  try {
    console.log(`Checking pending sessions for teacher: ${teacherId}`);
    
    // MongoDB ObjectId formatı kontrolü (24 karakter uzunluğunda hex string)
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(teacherId);
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(teacherId);
    
    console.log(`Teacher ID format: ${isMongoId ? 'MongoDB ObjectId' : (isUUID ? 'UUID' : 'Unknown')}`);
    
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending`, {
      // Public endpoint olduğu için kimlik doğrulama başlığını kaldırdık
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const sessions = await response.json();
    console.log('Pending sessions raw response:', sessions);
    
    if (!Array.isArray(sessions)) {
      console.error('Expected array of sessions but got:', typeof sessions);
      return [];
    }
    
    // Oturumları filtrele ve sadece 'waiting' durumundakileri döndür
    const pendingSessions = sessions.filter((session: VideoSession) => {
      console.log(`Session ${session._id} status: "${session.status}", isActive: ${session.isActive}`);
      return (session.status.toLowerCase() === 'waiting' && session.isActive);
    });
    
    console.log(`Filtered ${pendingSessions.length} pending sessions out of ${sessions.length} total`);
    return pendingSessions;
  } catch (error: any) {
    console.error('Error checking pending sessions:', error);
    throw new Error(error.message || 'Failed to check pending sessions');
  }
};

// Belirli bir görüşmeyi getirme
export const getVideoSession = async (sessionId: string): Promise<VideoSession> => {
  try {
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}`, {
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
    console.log(`Starting video session ${sessionId} with teacher: ${teacherName}, student: ${studentName}`);
    
    // Backend Query parametreleri bekliyor, JSON body değil
    const response = await fetch(
      `${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/start?teacherName=${encodeURIComponent(teacherName)}&studentName=${encodeURIComponent(studentName)}`,
      {
        method: 'PUT',
        // Public endpoint olduğu için kimlik doğrulama başlığını kaldırdık
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Start session error: Status ${response.status}, Response:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Session started successfully:', data);
    return data;
  } catch (error: any) {
    console.error('Error starting video session:', error);
    throw new Error(error.message || 'Failed to start video session');
  }
};

// Öğrenci için token alma
export const getStudentToken = async (sessionId: string, studentName: string): Promise<string> => {
  try {
    console.log(`Getting student token for session ${sessionId}, student: ${studentName}`);
    
    // Backend Query parametreleri bekliyor, JSON body değil
    const response = await fetch(
      `${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/student-token?studentName=${encodeURIComponent(studentName)}`,
      {
        // Public endpoint olduğu için kimlik doğrulama başlığını kaldırdık
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Get student token error: Status ${response.status}, Response:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Student token received successfully');
    return data.token;
  } catch (error: any) {
    console.error('Error getting student token:', error);
    throw new Error(error.message || 'Failed to get student token');
  }
};

// Görüşmeyi tamamlama
export const completeVideoSession = async (sessionId: string): Promise<VideoSession> => {
  try {
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/complete`, {
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

// Görüşmeyi sonlandır (LiveKit odası ve video oturumu)
export const endVideoSession = async (sessionId: string): Promise<VideoSession> => {
  try {
    console.log(`Ending video session ${sessionId}`);
    
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/end`, {
      method: 'PUT',
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`End session error: Status ${response.status}, Response:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Session ended successfully:', data);
    return data;
  } catch (error: any) {
    console.error('Error ending video session:', error);
    throw new Error(error.message || 'Failed to end video session');
  }
};

// Görüşmeyi iptal etme
export const cancelVideoSession = async (sessionId: string): Promise<VideoSession> => {
  try {
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/cancel`, {
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

// Öğretmen olarak video oturumuna katılma
export const joinVideoSessionAsTeacher = async (
  sessionId: string, 
  teacherName: string
): Promise<VideoSession> => {
  try {
    console.log(`Teacher ${teacherName} joining video session ${sessionId}`);
    
    // Önce oturum durumunu kontrol et
    const currentSession = await getVideoSession(sessionId);
    console.log(`Current session status before teacher join: ${currentSession.status}`);
    
    // Eğer oturum zaten aktifse, detayları getir
    if (currentSession.status === 'ACTIVE') {
      console.log('Session is already ACTIVE, getting session details directly');
      return await getActiveSessionDetails(sessionId);
    }
    
    // Oda adı olarak doğrudan sessionId kullan
    const roomName = sessionId;
    console.log(`Teacher using room name: ${roomName} (direct sessionId)`);
    
    // Öğretmen için token al ve oturumu başlat
    const response = await fetch(
      `${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/start?teacherName=${encodeURIComponent(teacherName)}&studentName=Waiting&roomName=${encodeURIComponent(roomName)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Teacher join session error: Status ${response.status}, Response:`, errorText);
      
      // Eğer oturum zaten aktifse, öğretmen için token al
      if (response.status === 400 && errorText.includes('already active')) {
        console.log('Session already active, getting teacher token');
        const activeSession = await getActiveSessionDetails(sessionId);
        
        // Öğretmen için doğrudan token al
        const tokenResponse = await fetch(
          `${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/teacher-token?teacherName=${encodeURIComponent(teacherName)}&roomName=${encodeURIComponent(roomName)}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        );
        
        if (!tokenResponse.ok) {
          const tokenErrorText = await tokenResponse.text();
          console.error(`Teacher token error: Status ${tokenResponse.status}, Response:`, tokenErrorText);
          throw new Error(`HTTP error! status: ${tokenResponse.status}`);
        }
        
        const tokenData = await tokenResponse.json();
        activeSession.roomToken = tokenData.token;
        
        return activeSession;
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Teacher joined successfully:', data);
    
    // Oturumu aktif olarak işaretle
    await updateSessionStatus(sessionId, 'ACTIVE');
    
    return data;
  } catch (error: any) {
    console.error('Error joining video session as teacher:', error);
    throw new Error(error.message || 'Failed to join video session as teacher');
  }
};

// Oturum durumunu güncelle
export const updateSessionStatus = async (sessionId: string, status: string): Promise<void> => {
  try {
    console.log(`Updating session ${sessionId} status to ${status}`);
    
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Update session status error: Status ${response.status}, Response:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log(`Session status updated to ${status} successfully`);
  } catch (error: any) {
    console.error('Error updating session status:', error);
    // Bu hatayı yutuyoruz çünkü kritik değil, sadece logluyoruz
  }
};

// Öğrenci olarak video oturumuna katılma
export const joinVideoSessionAsStudent = async (
  sessionId: string, 
  studentName: string
): Promise<string> => {
  try {
    console.log(`Student ${studentName} joining video session ${sessionId}`);
    
    // Önce oturum durumunu kontrol et
    const currentSession = await getVideoSession(sessionId);
    console.log(`Current session status before student join: ${currentSession.status}`);
    
    // Oturum durumunu büyük/küçük harften bağımsız olarak kontrol et
    // Hem "ACTIVE"/"active" hem de "WAITING"/"waiting" durumundaki oturumlara katılmaya izin ver
    const status = currentSession.status.toLowerCase();
    if (status !== 'active' && status !== 'waiting') {
      console.error(`Cannot join session as student: Session status is ${currentSession.status}`);
      throw new Error('Session is not ready yet');
    }
    
    // Oda adı olarak doğrudan sessionId kullan
    const roomName = sessionId;
    console.log(`Student using room name: ${roomName} (direct sessionId)`);
    
    // Öğrenci için token al
    const response = await fetch(
      `${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/student-token?studentName=${encodeURIComponent(studentName)}&roomName=${encodeURIComponent(roomName)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Student join session error: Status ${response.status}, Response:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Student joined successfully:', data);
    
    // Oturum durumunu güncelle
    try {
      await updateSessionStatus(sessionId, 'ACTIVE');
    } catch (updateError) {
      console.warn('Could not update session status, but continuing:', updateError);
    }
    
    return data.token;
  } catch (error: any) {
    console.error('Error joining video session as student:', error);
    throw new Error(error.message || 'Failed to join video session as student');
  }
};

// Aktif oturum detaylarını al
export const getActiveSessionDetails = async (sessionId: string): Promise<VideoSession> => {
  try {
    console.log(`Getting details for active session ${sessionId}`);
    
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Get session details error: Status ${response.status}, Response:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Session details retrieved successfully:', data);
    return data;
  } catch (error: any) {
    console.error('Error getting session details:', error);
    throw new Error(error.message || 'Failed to get session details');
  }
};

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
