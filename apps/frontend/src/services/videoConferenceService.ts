import { getAuthHeader } from './authService';
import { VIDEO_CONFERENCE_API_URL, LIVEKIT_SERVICE_URL } from '../config';

// Yeni bir video oturumu başlatma
export const createVideoSession = async (teacherId: string, studentId: string): Promise<VideoSession> => {
  try {
    console.log(`Creating video session for teacher: ${teacherId}, student: ${studentId}`);
    
    // Önce mevcut kullanıcının (öğrenci) bilgilerini al
    const userData = localStorage.getItem('user');
    let studentName = 'Anonim Öğrenci';
    
    if (userData) {
      const user = JSON.parse(userData);
      studentName = user.username || user.email || 'Anonim Öğrenci';
    }
    
    console.log(`Student name: ${studentName}`);
    
    // Öğretmen ID'sini normalize et - MongoDB ObjectID veya UUID olabilir
    // Eğer teacherId kısa bir string ise (örn. "teacher123"), gerçek bir ID ile değiştir
    // Bu, test amaçlı kullanılan ID'lerin gerçek ID'lerle değiştirilmesini sağlar
    if (teacherId && (teacherId.length < 10 || teacherId === 'teacher123')) {
      console.warn(`Converting test teacher ID "${teacherId}" to actual teacher ID from URL or localStorage`);
      
      // URL'den öğretmen ID'sini almayı dene
      const urlParams = new URLSearchParams(window.location.search);
      const urlTeacherId = urlParams.get('teacherId');
      
      if (urlTeacherId && urlTeacherId.length > 10) {
        teacherId = urlTeacherId;
        console.log(`Using teacher ID from URL: ${teacherId}`);
      } else {
        // Eğer URL'de yoksa, localStorage'dan almayı dene (öğretmen profil sayfasından)
        const teacherData = localStorage.getItem('currentTeacher');
        if (teacherData) {
          try {
            const teacher = JSON.parse(teacherData);
            if (teacher && (teacher.id || teacher._id)) {
              teacherId = teacher.id || teacher._id;
              console.log(`Using teacher ID from localStorage: ${teacherId}`);
            }
          } catch (e) {
            console.error('Error parsing teacher data from localStorage:', e);
          }
        }
      }
    }
    
    console.log(`Final teacher ID for video session: ${teacherId}`);
    
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify({
        teacherId,
        studentId
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Create session error: Status ${response.status}, Response:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Video session created successfully:', data);
    
    // Oturum oluşturulduktan sonra, öğretmene bildir
    try {
      const sessionId = data._id || data.id;
      console.log(`Notifying teacher ${teacherId} about new session ${sessionId}`);
      
      // Birden fazla bildirim yöntemi dene - daha güvenilir olması için
      let notificationSuccess = false;
      let notificationErrors = [];
      
      // 1. Önce register endpoint'ini dene (daha güvenilir)
      try {
        console.log(`Attempting to register student session via ${VIDEO_CONFERENCE_API_URL}/livekit-proxy/register-student-session`);
        const registerResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/livekit-proxy/register-student-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId,
            teacherId,
            studentId,
            studentName,
            action: 'session_created'
          }),
        });
        
        const registerData = await registerResponse.json();
        console.log('Register student session response:', registerData);
        
        if (registerResponse.ok) {
          console.log('Successfully registered new session with teacher via register endpoint');
          notificationSuccess = true;
        } else {
          const errorMsg = `Register endpoint failed with status: ${registerResponse.status}, response: ${JSON.stringify(registerData)}`;
          console.warn(errorMsg);
          notificationErrors.push(errorMsg);
        }
      } catch (registerError) {
        const errorMsg = `Register endpoint error: ${registerError instanceof Error ? registerError.message : String(registerError)}`;
        console.warn(errorMsg);
        notificationErrors.push(errorMsg);
      }
      
      // 2. Eğer register başarısız olduysa, notify-teacher endpoint'ini dene
      if (!notificationSuccess) {
        try {
          console.log(`Attempting to notify teacher via notifyTeacherAboutSession function`);
          const notifyResult = await notifyTeacherAboutSession(teacherId, sessionId, 'session_created');
          console.log('Notify teacher result:', notifyResult);
          
          if (notifyResult && notifyResult.success) {
            console.log('Successfully notified teacher via notify-teacher endpoint');
            notificationSuccess = true;
          } else {
            const errorMsg = `Notify teacher endpoint returned unsuccessful result: ${JSON.stringify(notifyResult)}`;
            console.warn(errorMsg);
            notificationErrors.push(errorMsg);
          }
        } catch (notifyError) {
          const errorMsg = `Notify teacher endpoint error: ${notifyError instanceof Error ? notifyError.message : String(notifyError)}`;
          console.warn(errorMsg);
          notificationErrors.push(errorMsg);
        }
      }
      
      // 3. Son çare olarak doğrudan video-sessions/teacher/:id/pending endpoint'ini çağır
      if (!notificationSuccess) {
        try {
          console.log(`Attempting to force refresh teacher pending sessions via ${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending?force=true`);
          // Öğretmenin bekleyen oturumlarını yenilemesini zorla
          const forceRefreshResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending?force=true`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          const forceRefreshData = await forceRefreshResponse.json();
          console.log('Force refresh response:', forceRefreshData);
          
          if (forceRefreshResponse.ok) {
            console.log('Successfully forced refresh of teacher pending sessions');
            notificationSuccess = true;
          } else {
            const errorMsg = `Force refresh failed with status: ${forceRefreshResponse.status}, response: ${JSON.stringify(forceRefreshData)}`;
            console.warn(errorMsg);
            notificationErrors.push(errorMsg);
          }
        } catch (refreshError) {
          const errorMsg = `Force refresh error: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`;
          console.warn(errorMsg);
          notificationErrors.push(errorMsg);
        }
      }
      
      // 4. Eğer tüm bildirim yöntemleri başarısız olduysa, uyarı göster ama devam et
      if (!notificationSuccess) {
        console.error(`ALL NOTIFICATION METHODS FAILED for teacher ${teacherId}, session ${sessionId}`);
        console.error('Notification errors:', notificationErrors);
        
        // Kritik bir hata olarak gösterme, ama logla
        console.warn('Continuing despite notification failures - teacher may not see the pending session');
      }
    } catch (notificationError) {
      console.error('Error during teacher notification process:', notificationError);
      // Bildirim hatası olsa bile devam et
    }
    
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
    // Sadece gerçek öğrenci isteklerini getir
    return await fetchPendingSessionsForTeacher(teacherId);
  } catch (error: any) {
    console.error('Error getting pending sessions for teacher:', error);
    throw new Error(error.message || 'Failed to get pending sessions for teacher');
  }
};

// Öğretmen için bekleyen görüşmeleri kontrol et
export const checkPendingSessionsForTeacher = async (teacherId: string): Promise<VideoSession[]> => {
  return await fetchPendingSessionsForTeacher(teacherId);
};

// Öğretmen için bekleyen görüşmeleri getir (gerçek API çağrısı)
export const fetchPendingSessionsForTeacher = async (teacherId: string): Promise<VideoSession[]> => {
  try {
    console.log(`Fetching pending sessions for teacher: ${teacherId}`);
    
    // TeacherId'nin formatını kontrol et
    if (!teacherId) {
      console.error('Invalid teacher ID, cannot fetch pending sessions');
      return [];
    }
    
    // API çağrısı yap
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(getAuthHeader() as Record<string, string>),
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      return [];
    }
    
    const sessions = await response.json();
    console.log('Pending sessions raw response:', sessions);
    
    if (!Array.isArray(sessions)) {
      console.error('Expected array of sessions but got:', typeof sessions);
      return [];
    }
    
    // Sadece geçerli oturumları döndür
    return sessions.filter((session: VideoSession) => {
      if (!session) {
        return false;
      }
      
      // Bu oturumlar için öğretmen ID'sini doğrula
      if (session.teacherId !== teacherId) {
        return false;
      }
      
      return true;
    });
  } catch (error: any) {
    console.error('Error fetching pending sessions for teacher:', error);
    return [];
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
    console.log(`Getting student token for ${studentName} in session ${sessionId}`);
    
    // Önce oturum detaylarını al
    const sessionResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      },
    });
    
    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error(`Get session error: Status ${sessionResponse.status}, Response:`, errorText);
      throw new Error(`HTTP error! status: ${sessionResponse.status}`);
    }
    
    const sessionData = await sessionResponse.json();
    
    // Oda adı olarak oturum detaylarındaki roomName'i kullan
    const roomName = sessionData.roomName || `room_${sessionData.teacherId}_${sessionData.studentId}_${Date.now()}`;
    
    // Öğrenci için token al - livekit-service mikroservisini kullan
    const response = await fetch(`${LIVEKIT_SERVICE_URL}/token`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomName,
        participantName: studentName,
        isTeacher: false
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Get student token error: Status ${response.status}, Response:`, errorText);
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
      return await getActiveSessionDetails(sessionId, teacherName);
    }
    
    // Oda adı olarak doğrudan sessionId kullan
    const roomName = sessionId;
    console.log(`Teacher using room name: ${roomName} (direct sessionId)`);
    
    // Oturumu başlat ve token al (tek adımda)
    const response = await fetch(
      `${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/start?teacherName=${encodeURIComponent(teacherName)}&roomName=${encodeURIComponent(roomName)}`,
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
      
      // Eğer oturum zaten aktifse, detayları getir
      if (response.status === 400 && errorText.includes('already active')) {
        console.log('Session is already active, getting details');
        return await getActiveSessionDetails(sessionId, teacherName);
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Yanıtı işle
    const sessionData = await response.json();
    console.log('Teacher joined successfully:', sessionData);
    
    // Yanıttan VideoSession objesi oluştur
    const videoSession: VideoSession = {
      _id: sessionId,
      id: sessionId,
      teacherId: currentSession.teacherId,
      studentId: currentSession.studentId,
      studentName: currentSession.studentName,
      roomName: roomName,
      status: 'ACTIVE',
      startTime: new Date().toISOString(),
      endTime: '',
      isActive: true,
      roomToken: sessionData.token || sessionData.roomToken, // Backend'in döndüğü token formatına uyum sağla
      createdAt: currentSession.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return videoSession;
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

// Öğrenci olarak video konferansa katıl
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
    
    // Oda adı olarak oturum detaylarındaki roomName'i kullan
    const roomName = currentSession.roomName || sessionId;
    console.log(`Student using room name: ${roomName} (from session details)`);
    
    // Öğrenci için token al - livekit-service mikroservisini kullan
    const response = await fetch(
      `${LIVEKIT_SERVICE_URL}/token`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomName: roomName,
          participantName: studentName,
          isTeacher: false
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Student join session error: Status ${response.status}, Response:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Student joined successfully:', data);
    
    // Oturum durumunu güncelle
    try {
      await updateSessionStatus(sessionId, 'ACTIVE');
      
      // Öğretmene bildirim gönder
      try {
        // Öğretmen ID'si
        const teacherId = currentSession.teacherId;
        
        if (teacherId) {
          console.log(`Attempting to notify teacher ${teacherId} about session ${sessionId}`);
          
          // Öğretmenin bekleyen oturumlarını yenile
          try {
            const forceRefreshResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending?force=true`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (forceRefreshResponse.ok) {
              console.log('Successfully forced refresh of teacher pending sessions');
              console.log(`Teacher ${teacherId} successfully notified about student joining session ${sessionId}`);
            } else {
              console.warn(`Failed to refresh teacher pending sessions, status: ${forceRefreshResponse.status}`);
            }
          } catch (refreshError) {
            console.warn('Force refresh error:', refreshError);
          }
        } else {
          console.warn('Teacher ID not found in session');
        }
      } catch (notifyError) {
        console.warn('Could not notify teacher, but continuing:', notifyError);
      }
    } catch (updateError) {
      console.error('Error updating session status:', updateError);
      // Oturum durumu güncellenemese bile devam et
    }
    
    return data.token;
  } catch (error: any) {
    console.error('Error joining video session as student:', error);
    throw new Error(error.message || 'Failed to join video session as student');
  }
};

// Öğretmene bildirim gönder
export const notifyTeacherAboutSession = async (teacherId: string, sessionId: string, action: string = 'student_joined'): Promise<any> => {
  console.log(`Attempting to notify teacher ${teacherId} about session ${sessionId} with action ${action}`);
  
  // Öğretmen ID'sinin geçerli olduğundan emin ol
  if (!teacherId || teacherId === 'undefined' || teacherId === 'null') {
    console.error('Invalid teacher ID for notification:', teacherId);
    throw new Error('Invalid teacher ID for notification');
  }
  
  // Son kontrol - teacherId'nin gerçekten bir string olduğundan emin ol
  const finalTeacherId = String(teacherId).trim();
  console.log(`Final teacher ID for notification: ${finalTeacherId}`);
  
  // Bildirim göndermek için endpoint
  const notificationEndpoint = {
    url: `${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${finalTeacherId}/pending?force=true`,
    method: 'GET'
  };
  
  try {
    console.log(`Notifying teacher via endpoint: ${notificationEndpoint.url}`);
    
    const response = await fetch(notificationEndpoint.url, {
      method: notificationEndpoint.method,
      headers: getAuthHeader()
    });
    
    if (response.ok) {
      console.log('Successfully notified teacher');
      return {
        success: true,
        verified: true,
        method: notificationEndpoint.url,
        message: `Teacher ${teacherId} notified about session ${sessionId}`,
        timestamp: new Date().toISOString()
      };
    } else {
      const errorText = await response.text();
      console.error(`Failed to notify teacher via ${notificationEndpoint.url}, status: ${response.status}, error:`, errorText);
      throw new Error(`Failed to notify teacher: ${response.status}`);
    }
  } catch (error) {
    console.error('Error notifying teacher:', error);
    throw new Error('Failed to notify teacher: Unknown error');
  }
};

// Aktif oturum detaylarını al
export const getActiveSessionDetails = async (sessionId: string, teacherName?: string): Promise<VideoSession> => {
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
    
    // Eğer öğretmen adı verilmişse ve token yoksa, öğretmen için token oluştur
    if (teacherName && !data.roomToken) {
      console.log(`No token found for teacher ${teacherName}, generating one...`);
      try {
        // Öğretmen için token oluştur
        const tokenResponse = await fetch(
          `${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/start?teacherName=${encodeURIComponent(teacherName)}&roomName=${encodeURIComponent(sessionId)}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          console.log('Teacher token generated successfully:', tokenData);
          
          // Token'ı data nesnesine ekle
          data.roomToken = tokenData.token || tokenData.roomToken;
        } else {
          console.error(`Failed to generate teacher token: ${tokenResponse.status}`);
        }
      } catch (tokenError) {
        console.error('Error generating teacher token:', tokenError);
      }
    }
    
    return data;
  } catch (error: any) {
    console.error('Error getting session details:', error);
    throw new Error(error.message || 'Failed to get session details');
  }
};

export interface VideoSession {
  _id?: string;
  id?: string;
  teacherId: string;
  studentId: string;
  studentName?: string;
  roomName: string;
  status: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  roomToken?: string;
  createdAt: string;
  updatedAt: string;
}
