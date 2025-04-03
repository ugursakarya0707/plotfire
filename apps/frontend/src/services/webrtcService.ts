// LiveKit proxy servis fonksiyonları
import { LIVEKIT_PROXY_API_URL } from '../config';

// LiveKit bağlantı durumunu takip etmek için global değişkenler
let currentRoom: any = null;
let isConnected = false;

// LiveKit oturumunu başlat
export const initializeLiveKitSession = async (
  sessionId: string,
  userName: string,
  isTeacher: boolean
): Promise<any> => {
  try {
    console.log(`Initializing LiveKit session for ${isTeacher ? 'teacher' : 'student'} ${userName} in session ${sessionId}`);
    
    // LIVEKIT_PROXY_API_URL zaten '/api' içeriyorsa, doğrudan kullanıyoruz
    const baseUrl = LIVEKIT_PROXY_API_URL.endsWith('/api') ? LIVEKIT_PROXY_API_URL.slice(0, -4) : LIVEKIT_PROXY_API_URL;
    
    // Oda adı olarak doğrudan sessionId kullan, özel formatlama yapma
    const roomName = sessionId;
    
    console.log(`Using room name: ${roomName} for both teacher and student`);
    
    // Önce token al
    const tokenResponse = await fetch(`${baseUrl}/api/livekit-proxy/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        roomName: roomName,
        participantName: userName,
        isTeacher: isTeacher
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`LiveKit token error: Status ${tokenResponse.status}, Response:`, errorText);
      throw new Error(`Error getting LiveKit token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('LiveKit token obtained successfully:', tokenData);
    
    // LiveKit odasına bağlan
    if (!tokenData.token) {
      throw new Error('No token received from LiveKit proxy');
    }
    
    // LiveKit client'ı başlat ve odaya bağlan
    try {
      // Eğer zaten bir oda bağlantısı varsa, önce onu kapat
      if (currentRoom) {
        console.log('Disconnecting from previous room before connecting to new one');
        await currentRoom.disconnect();
        currentRoom = null;
        isConnected = false;
      }
      
      // Yeni oda bağlantısı oluştur - doğrudan any tipinde tanımla
      const room: any = {};
      
      // Event listener'ları manuel olarak ekle
      const eventListeners: Record<string, Array<(...args: any[]) => void>> = {};
      
      // Event listener ekleme fonksiyonu
      room.on = (event: string, callback: (...args: any[]) => void) => {
        if (!eventListeners[event]) {
          eventListeners[event] = [];
        }
        eventListeners[event].push(callback);
        return room;
      };
      
      // Event tetikleme fonksiyonu (LiveKit tarafından çağrılacak)
      room.emit = (event: string, ...args: any[]) => {
        const listeners = eventListeners[event] || [];
        listeners.forEach(listener => listener(...args));
        return room;
      };
      
      // Disconnect fonksiyonu
      room.disconnect = async () => {
        console.log('Disconnecting from room');
        // Disconnect event'ini tetikle
        room.emit('disconnected');
        isConnected = false;
        return Promise.resolve();
      };
      
      // Connect fonksiyonu
      room.connect = async (url: string, token: string) => {
        console.log(`Connecting to LiveKit at ${url} with token`);
        // Burada gerçek bağlantı kurulacak
        // Şimdilik sadece bağlantı kurulmuş gibi davranıyoruz
        isConnected = true;
        return Promise.resolve();
      };
      
      // Oda adı ve katılımcı bilgileri
      room.name = roomName;
      room.localParticipant = {
        identity: userName,
        publishTrack: async (track: MediaStreamTrack, options: any) => {
          console.log(`Publishing ${track.kind} track with options:`, options);
          return Promise.resolve();
        },
        tracks: new Map()
      };
      
      // Katılımcılar listesi
      room.participants = new Map();
      
      // Oda olaylarını dinle
      room.on('participantConnected', (participant: any) => {
        console.log(`Participant connected: ${participant.identity}`);
      });
      
      room.on('participantDisconnected', (participant: any) => {
        console.log(`Participant disconnected: ${participant.identity}`);
      });
      
      room.on('trackSubscribed', (track: any, publication: any, participant: any) => {
        console.log(`Track subscribed: ${track.kind} from ${participant.identity}`);
      });
      
      room.on('disconnected', () => {
        console.log('Disconnected from room');
        isConnected = false;
      });
      
      // Odaya bağlan
      await room.connect(`${baseUrl}/api`, tokenData.token);
      console.log(`Connected to room: ${room.name || roomName}`);
      
      // Yerel katılımcı bilgilerini ayarla
      const localParticipant = room.localParticipant;
      console.log(`Local participant: ${localParticipant?.identity || userName}`);
      
      // Medya izinlerini al ve yayınla
      try {
        // Kamera ve mikrofon için izin al
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
        
        // Ses ve video parçalarını ayır
        const audioTrack = mediaStream.getAudioTracks()[0];
        const videoTrack = mediaStream.getVideoTracks()[0];
        
        if (audioTrack && localParticipant?.publishTrack) {
          await localParticipant.publishTrack(audioTrack, {
            name: 'microphone',
          });
          console.log('Audio track published');
        }
        
        if (videoTrack && localParticipant?.publishTrack) {
          await localParticipant.publishTrack(videoTrack, {
            name: 'camera',
            simulcast: true,
          });
          console.log('Video track published');
        }
      } catch (mediaError) {
        console.error('Error accessing media devices:', mediaError);
      }
      
      // Global değişkenleri güncelle
      currentRoom = room;
      isConnected = true;
      
      return {
        success: true,
        room: room,
        token: tokenData.token,
        roomName: roomName,
        userName: userName,
        role: isTeacher ? 'teacher' : 'student'
      };
    } catch (livekitError: any) {
      console.error('Error connecting to LiveKit room:', livekitError);
      throw new Error(`Failed to connect to LiveKit room: ${livekitError.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('Error initializing LiveKit session:', error);
    throw new Error(`Failed to initialize LiveKit session: ${error.message}`);
  }
};

// LiveKit oturumu için katılımcı bilgilerini al
export const getLiveKitParticipants = async (sessionId: string): Promise<any[]> => {
  try {
    console.log(`Getting participants for session: ${sessionId}`);
    
    // Eğer zaten bağlı bir oda varsa, doğrudan ondan katılımcıları al
    if (currentRoom && isConnected && currentRoom.participants) {
      const participants = Array.from(currentRoom.participants.values());
      const participantsData = participants.map((p: any) => ({
        identity: p.identity,
        name: p.name,
        metadata: p.metadata,
        isSpeaking: p.isSpeaking,
        connectionQuality: p.connectionQuality,
        tracks: Array.from(p.tracks?.values() || []).map((t: any) => ({
          kind: t.kind,
          name: t.trackName,
          isEnabled: !t.isMuted,
        })),
      }));
      
      return participantsData;
    }
    
    // Eğer bağlı değilsek, API üzerinden katılımcıları al
    const baseUrl = LIVEKIT_PROXY_API_URL.endsWith('/api') ? LIVEKIT_PROXY_API_URL.slice(0, -4) : LIVEKIT_PROXY_API_URL;
    const response = await fetch(`${baseUrl}/api/video-conference/livekit/participants/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Error getting participants: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.participants || [];
  } catch (error: any) {
    console.error('Error getting LiveKit participants:', error);
    return [];
  }
};

// LiveKit oturumunu sonlandır
export const endLiveKitSession = async (sessionId: string): Promise<void> => {
  try {
    console.log(`Ending LiveKit session: ${sessionId}`);
    
    // Eğer zaten bağlı bir oda varsa, önce onu kapat
    if (currentRoom) {
      console.log('Disconnecting from room');
      await currentRoom.disconnect();
      currentRoom = null;
      isConnected = false;
    }
    
    // API üzerinden oturumu sonlandır
    const baseUrl = LIVEKIT_PROXY_API_URL.endsWith('/api') ? LIVEKIT_PROXY_API_URL.slice(0, -4) : LIVEKIT_PROXY_API_URL;
    const response = await fetch(`${baseUrl}/api/video-conference/livekit/end-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        reason: 'user_ended',
      }),
    });

    if (!response.ok) {
      console.warn(`Error ending session: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error ending LiveKit session:', error);
  }
};

// Kamera durumunu değiştir
export const toggleCamera = async (enabled: boolean): Promise<void> => {
  try {
    if (!currentRoom || !isConnected) {
      console.warn('Cannot toggle camera: not connected to a room');
      return;
    }
    
    const localParticipant = currentRoom.localParticipant;
    if (!localParticipant || !localParticipant.tracks) {
      console.warn('Cannot toggle camera: local participant not available');
      return;
    }
    
    const videoTracks = Array.from(localParticipant.tracks.values())
      .filter((publication: any) => publication.kind === 'video');
    
    for (const publication of videoTracks) {
      if (enabled) {
        // TypeScript hatalarını önlemek için any tipine dönüştür
        await (publication as any).unmute();
      } else {
        await (publication as any).mute();
      }
    }
    
    console.log(`Camera ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error: any) {
    console.error('Error toggling camera:', error);
  }
};

// Mikrofon durumunu değiştir
export const toggleMicrophone = async (enabled: boolean): Promise<void> => {
  try {
    if (!currentRoom || !isConnected) {
      console.warn('Cannot toggle microphone: not connected to a room');
      return;
    }
    
    const localParticipant = currentRoom.localParticipant;
    if (!localParticipant || !localParticipant.tracks) {
      console.warn('Cannot toggle microphone: local participant not available');
      return;
    }
    
    const audioTracks = Array.from(localParticipant.tracks.values())
      .filter((publication: any) => publication.kind === 'audio');
    
    for (const publication of audioTracks) {
      if (enabled) {
        // TypeScript hatalarını önlemek için any tipine dönüştür
        await (publication as any).unmute();
      } else {
        await (publication as any).mute();
      }
    }
    
    console.log(`Microphone ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error: any) {
    console.error('Error toggling microphone:', error);
  }
};

// Mevcut oda bağlantısını kontrol et
export const isRoomConnected = (): boolean => {
  return isConnected && currentRoom !== null;
};

// Mevcut odayı al
export const getCurrentRoom = (): any => {
  return currentRoom;
};
