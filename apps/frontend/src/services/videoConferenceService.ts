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
                studentId: localStorage.getItem('userId') || 'unknown', // Gerçek öğrenci ID'sini kullan
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
export const notifyTeacherAboutSession = async (teacherId: string, sessionId: string, action: string = 'student_joined'): Promise<any> => {
  console.log(`Attempting to notify teacher ${teacherId} about session ${sessionId} with action ${action}`);
  
  // Öğretmen ID'sinin geçerli olduğundan emin ol
  if (!teacherId || teacherId === 'undefined' || teacherId === 'null') {
    console.error('Invalid teacher ID for notification:', teacherId);
    throw new Error('Invalid teacher ID for notification');
  }
  
  // Öğretmen ID'sini normalize et - MongoDB ObjectID veya UUID olabilir
  // Eğer teacherId kısa bir string ise (örn. "teacher123"), gerçek bir ID ile değiştir
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
      } else {
        // Son çare: Mevcut kullanıcı öğretmen ise, onun ID'sini kullan
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user && user.userType === 'teacher' && (user.id || user._id)) {
              teacherId = user.id || user._id;
              console.log(`Using current user (teacher) ID: ${teacherId}`);
            }
          } catch (e) {
            console.error('Error parsing user data from localStorage:', e);
          }
        }
      }
    }
  }
  
  console.log(`Final teacher ID for notification: ${teacherId}`);
  
  // Birden fazla endpoint deneyerek bildirim göndermeyi dene
  const endpoints = [
    // 1. Birincil endpoint - doğrudan livekit-proxy controller üzerinden (en güvenilir)
    {
      url: `${VIDEO_CONFERENCE_API_URL}/livekit-proxy/notify-teacher`,
      method: 'POST',
      body: { teacherId, sessionId, action }
    },
    // 2. İkincil endpoint - video-sessions controller üzerinden (test edildi ve çalışıyor)
    {
      url: `${VIDEO_CONFERENCE_API_URL}/video-sessions/notify-teacher`,
      method: 'POST',
      body: { teacherId, sessionId, action }
    },
    // 3. Öğrenci oturumunu kaydet (öğretmen bildirimini de içerir)
    {
      url: `${VIDEO_CONFERENCE_API_URL}/livekit-proxy/register-student-session`,
      method: 'POST',
      body: { 
        sessionId, 
        teacherId, 
        studentId: localStorage.getItem('userId') || 'unknown', // Gerçek öğrenci ID'sini kullan
        action 
      }
    },
    // 4. Doğrudan öğretmen bekleyen oturumlarını güncelle
    {
      url: `${VIDEO_CONFERENCE_API_URL}/mcp/teachers/${teacherId}/pending-sessions`,
      method: 'PUT',
      body: { 
        pendingSessions: [{
          _id: sessionId,
          id: sessionId,
          teacherId,
          status: 'WAITING',
          timestamp: new Date().toISOString(),
          action,
          isActive: true,
          studentId: localStorage.getItem('userId') || 'unknown' // Gerçek öğrenci ID'sini kullan
        }]
      }
    },
    // 5. Öğretmenin bekleyen oturumlarını zorla yenile
    {
      url: `${VIDEO_CONFERENCE_API_URL}/mcp/teachers/${teacherId}/refresh-pending-sessions`,
      method: 'POST',
      body: { teacherId }
    },
    // 6. LiveKit doğrudan erişim - öğretmen için oturum kaydı
    {
      url: `${VIDEO_CONFERENCE_API_URL}/livekit-proxy/room/${sessionId}/metadata`,
      method: 'PUT',
      body: { 
        metadata: {
          teacherId,
          sessionId,
          action,
          timestamp: new Date().toISOString(),
          isActive: true,
          studentId: localStorage.getItem('userId') || 'unknown' // Gerçek öğrenci ID'sini kullan
        }
      }
    }
  ];
  
  let lastError: Error | null = null;
  let notificationSuccess = false;
  let successfulEndpoint = '';
  
  // Tüm endpointleri sırayla dene
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying to notify teacher via endpoint: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeader() as Record<string, string>),
        },
        body: JSON.stringify(endpoint.body),
      });
      
      if (response.ok) {
        console.log(`Successfully notified teacher ${teacherId} via ${endpoint.url}`);
        notificationSuccess = true;
        successfulEndpoint = endpoint.url;
        
        // Yanıtı JSON olarak parse etmeyi dene
        try {
          const responseData = await response.json();
          console.log('Notification response data:', responseData);
          
          // Yanıtta verified alanı varsa ve false ise, doğrulama başarısız olmuş demektir
          if (responseData && responseData.verified === false) {
            console.warn('Server reported notification was not verified, will try next method');
            notificationSuccess = false;
          }
        } catch (parseError) {
          console.warn('Could not parse notification response:', parseError);
        }
        
        if (notificationSuccess) {
          break;
        }
      } else {
        const errorText = await response.text();
        console.warn(`Failed to notify teacher via ${endpoint.url}, status: ${response.status}, error: ${errorText}`);
      }
    } catch (error) {
      console.warn(`Error notifying teacher via ${endpoint.url}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  // Tüm bildirim yöntemleri başarısız olduysa, son çare olarak manuel oturum oluştur
  if (!notificationSuccess) {
    try {
      console.log('All notification methods failed, attempting to manually create a session');
      
      // Öğretmen için manuel oturum oluştur
      const manualSessionResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/manual-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeader() as Record<string, string>),
        },
        body: JSON.stringify({
          teacherId,
          sessionId,
          action,
          status: 'WAITING',
          isActive: true
        }),
      });
      
      if (manualSessionResponse.ok) {
        console.log('Successfully created manual session for teacher');
        notificationSuccess = true;
        successfulEndpoint = 'manual-create';
      } else {
        const errorText = await manualSessionResponse.text();
        console.warn(`Manual session creation failed, status: ${manualSessionResponse.status}, error: ${errorText}`);
      }
    } catch (manualError) {
      console.warn('Manual session creation error:', manualError);
      lastError = manualError instanceof Error ? manualError : new Error(String(manualError));
    }
  }
  
  // Oturum durumunu her durumda güncelle (bildirim başarısız olsa bile)
  try {
    console.log(`Updating session ${sessionId} status to ACTIVE`);
    
    const updateResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/${sessionId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    
    if (updateResponse.ok) {
      console.log('Session status updated to ACTIVE successfully');
    } else {
      const errorText = await updateResponse.text();
      console.warn(`Failed to update session status, status: ${updateResponse.status}, error: ${errorText}`);
    }
  } catch (updateError) {
    console.warn('Error updating session status:', updateError);
  }
  
  // Bildirim başarılı olup olmadığını doğrula
  let verificationSuccess = false;
  
  if (notificationSuccess) {
    try {
      console.log(`Verifying teacher ${teacherId} notification was successful`);
      
      // Öğretmenin bekleyen oturumlarını kontrol et
      const verificationResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending?force=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeader() as Record<string, string>),
        }
      });
      
      if (verificationResponse.ok) {
        const pendingSessions = await verificationResponse.json();
        
        if (pendingSessions && Array.isArray(pendingSessions)) {
          const sessionExists = pendingSessions.some(session => 
            (session._id === sessionId || session.id === sessionId) && 
            ((session.status || '').toUpperCase() === 'WAITING' || (session.status || '').toUpperCase() === 'ACTIVE')
          );
          
          if (sessionExists) {
            console.log(`Verification successful: Session ${sessionId} found in teacher ${teacherId}'s pending sessions`);
            verificationSuccess = true;
          } else {
            console.warn(`Verification failed: Session ${sessionId} not found in teacher ${teacherId}'s pending sessions`);
          }
        } else {
          console.warn(`Verification failed: Could not retrieve teacher ${teacherId}'s pending sessions`);
        }
      } else {
        console.warn(`Verification failed: Could not get pending sessions, status: ${verificationResponse.status}`);
      }
    } catch (verificationError) {
      console.warn(`Error during verification: ${verificationError}`);
    }
  }
  
  // Bildirim başarısız olduysa ve doğrulama da başarısız olduysa hata fırlat
  if (!notificationSuccess || !verificationSuccess) {
    console.error(`Notification ${notificationSuccess ? 'succeeded' : 'failed'} but verification ${verificationSuccess ? 'succeeded' : 'failed'} for teacher ${teacherId}, session ${sessionId}`);
    
    // Bildirim başarılı ama doğrulama başarısız olduysa, bildirim başarısız olarak kabul et
    if (notificationSuccess && !verificationSuccess) {
      console.warn(`Notification appeared successful via ${successfulEndpoint} but verification failed, treating as failure`);
      notificationSuccess = false;
    }
    
    if (!notificationSuccess) {
      throw new Error(`Failed to notify teacher: ${lastError?.message || 'Unknown error'}`);
    }
  }
  
  return {
    success: true,
    verified: verificationSuccess,
    method: successfulEndpoint,
    message: `Teacher ${teacherId} notified about session ${sessionId}`,
    timestamp: new Date().toISOString()
  };
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
