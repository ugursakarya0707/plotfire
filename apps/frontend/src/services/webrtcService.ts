// LiveKit proxy servis fonksiyonları
import { LIVEKIT_PROXY_API_URL } from '../config';

// LiveKit oturumunu başlat
export const initializeLiveKitSession = async (
  sessionId: string,
  userName: string,
  isTeacher: boolean
): Promise<void> => {
  try {
    console.log(`Initializing LiveKit session for ${isTeacher ? 'teacher' : 'student'} ${userName} in session ${sessionId}`);
    
    // LIVEKIT_PROXY_API_URL zaten '/api' içeriyorsa, doğrudan kullanıyoruz
    const baseUrl = LIVEKIT_PROXY_API_URL.endsWith('/api') ? LIVEKIT_PROXY_API_URL.slice(0, -4) : LIVEKIT_PROXY_API_URL;
    
    // Oda adı olarak doğrudan sessionId kullan, özel formatlama yapma
    const roomName = sessionId;
    
    console.log(`Using room name: ${roomName} for both teacher and student`);
    
    const response = await fetch(`${baseUrl}/api/video-conference/livekit/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sessionId: roomName, // Oda adı olarak doğrudan sessionId kullan
        userName,
        role: isTeacher ? 'teacher' : 'student'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LiveKit connection error: Status ${response.status}, Response:`, errorText);
      throw new Error(`Error connecting to LiveKit: ${response.status}`);
    }

    const data = await response.json();
    console.log('LiveKit connection successful:', data);
    
    return data;
  } catch (error: any) {
    console.error('Error connecting to LiveKit:', error);
    throw new Error(`Failed to connect to LiveKit: ${error.message}`);
  }
};

// LiveKit oturumu için katılımcı bilgilerini al
export const getLiveKitParticipants = async (sessionId: string): Promise<any[]> => {
  try {
    console.log(`Getting participants for session: ${sessionId}`);
    const baseUrl = LIVEKIT_PROXY_API_URL.endsWith('/api') ? LIVEKIT_PROXY_API_URL.slice(0, -4) : LIVEKIT_PROXY_API_URL;
    const response = await fetch(`${baseUrl}/api/video-conference/livekit/participants/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // 404 hatasını özel olarak ele al - oda henüz oluşturulmamış olabilir
      if (response.status === 404) {
        console.warn(`Room for session ${sessionId} not found or has no participants yet`);
        return [];
      }
      throw new Error(`Failed to get participants: ${response.status}`);
    }

    const data = await response.json();
    return data.participants || [];
  } catch (error: any) {
    console.error('Error getting participants:', error);
    // Hata durumunda boş dizi döndür
    return [];
  }
};

// LiveKit oturumunu sonlandır
export const endLiveKitSession = async (sessionId: string): Promise<void> => {
  try {
    const baseUrl = LIVEKIT_PROXY_API_URL.endsWith('/api') ? LIVEKIT_PROXY_API_URL.slice(0, -4) : LIVEKIT_PROXY_API_URL;
    const response = await fetch(`${baseUrl}/api/video-conference/livekit/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to end LiveKit session: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error ending LiveKit session:', error);
    throw error;
  }
};

// Kamera durumunu değiştir
export const toggleCamera = async (sessionId: string, enabled: boolean): Promise<void> => {
  try {
    const baseUrl = LIVEKIT_PROXY_API_URL.endsWith('/api') ? LIVEKIT_PROXY_API_URL.slice(0, -4) : LIVEKIT_PROXY_API_URL;
    const response = await fetch(`${baseUrl}/api/video-conference/livekit/toggle-camera`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        enabled,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle camera: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error toggling camera:', error);
    throw error;
  }
};

// Mikrofon durumunu değiştir
export const toggleMicrophone = async (sessionId: string, enabled: boolean): Promise<void> => {
  try {
    const baseUrl = LIVEKIT_PROXY_API_URL.endsWith('/api') ? LIVEKIT_PROXY_API_URL.slice(0, -4) : LIVEKIT_PROXY_API_URL;
    const response = await fetch(`${baseUrl}/api/video-conference/livekit/toggle-microphone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        enabled,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle microphone: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error toggling microphone:', error);
    throw error;
  }
};
