import { getAuthHeader } from './authService';
import { VIDEO_CONFERENCE_API_URL } from '../config';

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
    
    const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify({
        teacherId,
        studentId,
        studentName
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
      
      // 1. Önce register endpoint'ini dene (daha güvenilir)
      try {
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
        
        if (registerResponse.ok) {
          console.log('Successfully registered new session with teacher via register endpoint');
          notificationSuccess = true;
        } else {
          console.warn(`Register endpoint failed with status: ${registerResponse.status}`);
        }
      } catch (registerError) {
        console.warn('Register endpoint error:', registerError);
      }
      
      // 2. Eğer register başarısız olduysa, notify-teacher endpoint'ini dene
      if (!notificationSuccess) {
        try {
          await notifyTeacherAboutSession(teacherId, sessionId, 'session_created');
          console.log('Successfully notified teacher via notify-teacher endpoint');
          notificationSuccess = true;
        } catch (notifyError) {
          console.warn('Notify teacher endpoint error:', notifyError);
        }
      }
      
      // 3. Son çare olarak doğrudan video-sessions/teacher/:id/pending endpoint'ini çağır
      if (!notificationSuccess) {
        try {
          // Öğretmenin bekleyen oturumlarını yenilemesini zorla
          const forceRefreshResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending?force=true`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (forceRefreshResponse.ok) {
            console.log('Successfully forced refresh of teacher pending sessions');
            notificationSuccess = true;
          }
        } catch (refreshError) {
          console.warn('Force refresh error:', refreshError);
        }
      }
      
      if (notificationSuccess) {
        console.log(`Teacher ${teacherId} successfully notified about new session ${sessionId}`);
      } else {
        console.warn('All notification methods failed, teacher may not see this session immediately');
      }
    } catch (notifyError) {
      console.warn('Could not notify teacher, but continuing with session creation:', notifyError);
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
    
    try {
      // Öğretmen için LiveKit token al
      const tokenResponse = await fetch(
        `${VIDEO_CONFERENCE_API_URL}/livekit-proxy/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomName: roomName,
            participantName: teacherName,
            isTeacher: true
          }),
        }
      );
      
      if (!tokenResponse.ok) {
        const tokenErrorText = await tokenResponse.text();
        console.error(`Teacher token error: Status ${tokenResponse.status}, Response:`, tokenErrorText);
        throw new Error(`HTTP error! status: ${tokenResponse.status}`);
      }
      
      const tokenData = await tokenResponse.json();
      console.log('Teacher token obtained successfully');
      
      // Oturumu başlat veya güncelle
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
        
        // Eğer oturum zaten aktifse, sadece token ile devam et
        if (response.status === 400 && errorText.includes('already active')) {
          console.log('Session is already active, continuing with token only');
          
          const activeSession = await getActiveSessionDetails(sessionId);
          activeSession.roomToken = tokenData.token;
          
          return activeSession;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Teacher joined successfully:', data);
      
      // Aldığımız token'ı data nesnesine ekle
      data.roomToken = tokenData.token;
      
      // Oturumu aktif olarak işaretle
      await updateSessionStatus(sessionId, 'ACTIVE');
      
      return data;
    } catch (tokenError) {
      console.error('Token error, falling back to traditional method:', tokenError);
      
      // Eski yöntem - doğrudan session/start endpoint'i
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
        console.error(`Backup teacher join error: Status ${response.status}, Response:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Teacher joined with backup method:', data);
      
      // Oturumu aktif olarak işaretle
      await updateSessionStatus(sessionId, 'ACTIVE');
      
      return data;
    }
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
    
    // Oda adı olarak doğrudan sessionId kullan
    const roomName = sessionId;
    console.log(`Student using room name: ${roomName} (direct sessionId)`);
    
    // Öğrenci için token al - LiveKit proxy servisini kullan
    const response = await fetch(
      `${VIDEO_CONFERENCE_API_URL}/livekit-proxy/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Student joined successfully:', data);
    
    // Oturum durumunu güncelle
    try {
      await updateSessionStatus(sessionId, 'ACTIVE');
      
      // Öğretmene bildirim gönder - öğretmenin bekleyen oturumları yenilemesini sağla
      try {
        // Öğretmen ID'si kontrolü ve bildirim gönderme
        let teacherId = currentSession.teacherId;
        
        // TeacherId yoksa veya geçersizse, session bilgilerinden almayı dene
        if (!teacherId && currentSession._id) {
          // MongoDB ObjectId formatındaki session ID'den teacherId çıkarımı yapılamaz
          // Alternatif olarak, createVideoSession sırasında kaydedilen bilgileri kullan
          
          try {
            // Oturum detaylarını MCP'den almayı dene
            const sessionDetailsResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (sessionDetailsResponse.ok) {
              const sessionDetails = await sessionDetailsResponse.json();
              if (sessionDetails && sessionDetails.teacherId) {
                teacherId = sessionDetails.teacherId;
                console.log(`Retrieved teacher ID ${teacherId} from session details`);
              }
            }
          } catch (detailsError) {
            console.warn('Could not get session details:', detailsError);
          }
        }
        
        if (teacherId) {
          console.log(`Notifying teacher ${teacherId} about student joining session ${sessionId}`);
          
          // Bildirim için birden fazla yöntem dene
          let notificationSuccess = false;
          
          // 1. Doğrudan register endpoint'ini kullan (daha güvenilir)
          try {
            const registerResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/livekit-proxy/register-student-session`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sessionId: sessionId,
                teacherId: teacherId,
                studentId: currentSession.studentId || 'unknown',
                studentName: studentName,
                action: 'student_joined'
              }),
            });
            
            if (registerResponse.ok) {
              console.log('Successfully registered student session with teacher');
              notificationSuccess = true;
            } else {
              console.warn(`Register endpoint failed with status: ${registerResponse.status}`);
            }
          } catch (registerError) {
            console.warn('Register endpoint error:', registerError);
          }
          
          // 2. Eğer register başarısız olduysa, notify-teacher endpoint'ini dene
          if (!notificationSuccess) {
            try {
              await notifyTeacherAboutSession(teacherId, sessionId, 'student_joined');
              console.log('Successfully notified teacher via notify-teacher endpoint');
              notificationSuccess = true;
            } catch (notifyError) {
              console.warn('Notify teacher endpoint error:', notifyError);
            }
          }
          
          // 3. Son çare olarak doğrudan video-sessions/teacher/:id/pending endpoint'ini çağır
          if (!notificationSuccess) {
            try {
              // Öğretmenin bekleyen oturumlarını yenilemesini zorla
              const forceRefreshResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending?force=true`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              if (forceRefreshResponse.ok) {
                console.log('Successfully forced refresh of teacher pending sessions');
                notificationSuccess = true;
              }
            } catch (refreshError) {
              console.warn('Force refresh error:', refreshError);
            }
          }
          
          if (notificationSuccess) {
            console.log(`Teacher ${teacherId} successfully notified about student joining session ${sessionId}`);
          } else {
            console.warn('All notification methods failed, teacher may not see this session immediately');
          }
        } else {
          console.warn('Teacher ID not found in session and could not be retrieved from alternative sources');
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
export const notifyTeacherAboutSession = async (teacherId: string, sessionId: string, action: string = 'student_joined'): Promise<void> => {
  try {
    console.log(`Notifying teacher ${teacherId} about session ${sessionId}, action: ${action}`);
    
    // UUID formatını kontrol et - MongoDB ObjectID için uyumluluk kontrolü ekle
    if (!teacherId) {
      console.error('Teacher ID is missing, cannot notify teacher');
      return;
    }
    
    // Bildirim stratejileri - sırayla dene
    const endpoints = [
      // 1. Ana bildirim yöntemi
      {
        url: `${VIDEO_CONFERENCE_API_URL}/video-sessions/notify-teacher`,
        method: 'POST',
        body: { teacherId, sessionId, action }
      },
      // 2. Alternatif: LiveKit proxy register endpoint
      {
        url: `${VIDEO_CONFERENCE_API_URL}/livekit-proxy/register-student-session`,
        method: 'POST',
        body: { teacherId, sessionId, studentId: 'auto', action }
      },
      // 3. Son çare: video-conference modülü
      {
        url: `${VIDEO_CONFERENCE_API_URL}/video-conference/livekit/notify-teacher`,
        method: 'POST',
        body: { teacherId, sessionId, action }
      }
    ];
    
    let success = false;
    
    // Her endpoint'i sırayla dene
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying notification endpoint: ${endpoint.url}`);
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(endpoint.body),
        });
        
        if (response.ok) {
          console.log(`Teacher notification successful via ${endpoint.url}`);
          success = true;
          break;
        } else {
          const errorText = await response.text();
          console.warn(`Notification failed for ${endpoint.url}: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.warn(`Error with endpoint ${endpoint.url}:`, error);
      }
    }
    
    if (!success) {
      console.warn('All notification methods failed, but continuing. Teacher may not see this session in their dashboard.');
    }
  } catch (error: any) {
    console.error('Error in notification process:', error);
    // Kritik değil - devam et
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
