// LiveKit proxy servis fonksiyonları
import { LIVEKIT_PROXY_API_URL, LIVEKIT_SERVICE_URL } from '../config';

// LiveKit için basit tip tanımlamaları
interface LiveKitRoom {
  on: (event: string, callback: Function) => void;
  connect: (url: string, token: string, options?: any) => Promise<void>;
  disconnect: () => Promise<void>;
  localParticipant?: LiveKitParticipant;
  participants: Map<string, LiveKitParticipant>;
  disconnectReason?: string;
}

interface LiveKitParticipant {
  identity: string;
  name?: string;
  metadata?: string;
  isSpeaking: boolean;
  connectionQuality: number;
  trackPublications: Map<string, LiveKitTrackPublication>;
  isLocal?: boolean;
  enableCameraAndMicrophone?: () => Promise<void>;
}

interface LiveKitTrackPublication {
  kind: string;
  trackName: string;
  isMuted: boolean;
  track?: LiveKitTrack;
  mute: () => Promise<void>;
  unmute: () => Promise<void>;
}

interface LiveKitTrack {
  kind: string;
  sid: string;
  name?: string;
}

// LiveKit SDK - any tipini kullanarak uyumsuzluk hatalarını önleyelim
interface LiveKitImport {
  default: any;
  Room: any;
  LocalParticipant: any;
}

// LiveKit bağlantı durumunu takip etmek için global değişkenler
let currentRoom: LiveKitRoom | null = null;
let isConnected = false;

// LiveKit oturumunu başlat
export const initializeLiveKitSession = async (
  sessionId: string,
  userName: string,
  isTeacher: boolean
): Promise<any> => {
  try {
    console.log(`Initializing LiveKit session for ${isTeacher ? 'teacher' : 'student'} ${userName} in session ${sessionId}`);
    
    // Oda adı olarak doğrudan sessionId kullan
    const roomName = sessionId;
    
    console.log(`Using room name: ${roomName}`);
    
    // Öğrenci ve öğretmen için farklı akışlar
    if (isTeacher) {
      console.log(`Teacher ${userName} joining existing room: ${roomName}`);
    } else {
      console.log(`Student ${userName} creating/joining room: ${roomName}`);
      
      // Öğrenci ise, önce odayı oluştur - livekit-service mikroservisini kullan
      const createRoomResponse = await fetch(`${LIVEKIT_SERVICE_URL}/room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          roomName: roomName,
          metadata: JSON.stringify({
            sessionId: sessionId,
            createdBy: userName,
            isTeacher: isTeacher
          })
        }),
      });
      
      if (!createRoomResponse.ok) {
        throw new Error(`Failed to create LiveKit room: Status ${createRoomResponse.status}`);
      }
      
      console.log('Room created successfully');
    }
    
    // Token al - livekit-service mikroservisini kullan
    const tokenResponse = await fetch(`${LIVEKIT_SERVICE_URL}/token`, {
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
    
    try {
      // LiveKit SDK'sını dinamik olarak import et
      const LiveKit: LiveKitImport = await import('livekit-client');
      
      // Mevcut bir oda varsa ve bağlıysa, önce onu kapat
      if (currentRoom) {
        console.log('Disconnecting from previous room before connecting to new one');
        try {
          await currentRoom.disconnect();
          isConnected = false;
        } catch (disconnectError: any) {
          console.warn('Error disconnecting from previous room:', disconnectError);
          // Önceki odadan çıkış hatası kritik değil, devam et
        }
      }
      
      // Yeni bir oda oluştur
      const room = new LiveKit.Room();
      
      console.log('Room object created, setting up event listeners');
      
      // Oda olaylarını dinle
      // @ts-ignore - LiveKit versiyonu ile ilgili TypeScript hatalarını görmezden gel
      room.on('participantConnected', (participant: LiveKitParticipant) => {
        console.log(`Participant connected: ${participant.identity}`, participant);
        console.log(`Participant metadata: ${participant.metadata}`);
        
        // Öğretmen bağlandığında öğrenci için veya öğrenci bağlandığında öğretmen için bildirim
        const participantMetadata = participant.metadata || '';
        if ((isTeacher && !participantMetadata.includes('teacher')) || 
            (!isTeacher && participantMetadata.includes('teacher'))) {
          console.log(`${isTeacher ? 'Student' : 'Teacher'} has joined the room!`);
        }
      });
      
      // @ts-ignore - LiveKit versiyonu ile ilgili TypeScript hatalarını görmezden gel
      room.on('participantDisconnected', (participant: LiveKitParticipant) => {
        console.log(`Participant disconnected: ${participant.identity}`);
        console.log(`Participant metadata: ${participant.metadata}`);
      });
      
      // @ts-ignore - LiveKit versiyonu ile ilgili TypeScript hatalarını görmezden gel
      room.on('disconnected', () => {
        console.log('Room disconnected');
        console.log('Disconnect reason:', room.disconnectReason);
        isConnected = false;
      });
      
      // @ts-ignore - LiveKit versiyonu ile ilgili TypeScript hatalarını görmezden gel
      room.on('connected', () => {
        console.log('Room connected successfully');
        if (room.localParticipant) {
          console.log(`Local participant: ${room.localParticipant.identity}`);
          console.log(`Local participant state:`, room.localParticipant);
        }
        console.log(`Remote participants: ${room.participants.size}`);
        // @ts-ignore - LiveKit versiyonu ile ilgili TypeScript hatalarını görmezden gel
        Array.from(room.participants.values()).forEach((p: any, i) => {
          console.log(`Remote participant ${i+1}: ${p.identity}, metadata: ${p.metadata}`);
        });
        isConnected = true;
      });
      
      // @ts-ignore - LiveKit versiyonu ile ilgili TypeScript hatalarını görmezden gel
      room.on('reconnecting', () => {
        console.log('Attempting to reconnect to room...');
      });
      
      // @ts-ignore - LiveKit versiyonu ile ilgili TypeScript hatalarını görmezden gel
      room.on('reconnected', () => {
        console.log('Reconnected to room successfully');
        isConnected = true;
      });
      
      // LiveKit WebSocket URL'sini oluştur
      const wsUrl = tokenData.wsUrl || 'wss://postply-s2s0711i.livekit.cloud';
      console.log(`Connecting to LiveKit WebSocket URL: ${wsUrl}`);
      
      // Odaya bağlan
      console.log('Connecting to room with token:', tokenData.token.substring(0, 20) + '...');
      
      // @ts-ignore - LiveKit versiyonu ile ilgili TypeScript hatalarını görmezden gel
      await room.connect(wsUrl, tokenData.token, {
        autoSubscribe: true,
      });
      
      console.log('Connected to room successfully');
      
      // Odayı global değişkene kaydet
      currentRoom = room;
      
      // 2 saniye sonra katılımcıları kontrol et
      setTimeout(async () => {
        console.log('Checking participants after connection...');
        const participants = await getLiveKitParticipants(sessionId);
        console.log(`Participants after connection: ${participants.length}`);
        participants.forEach((p, i) => {
          console.log(`Participant ${i+1}: ${p.identity}`);
        });
      }, 2000);
      
      return {
        room,
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
    if (currentRoom && isConnected) {
      console.log('Getting participants from connected room');
      const participants = Array.from(currentRoom.participants.values());
      
      // Katılımcı sayısını logla
      console.log(`Found ${participants.length} participants in connected room`);
      
      // Katılımcı veri tipi tanımı
      interface ParticipantData {
        identity: string;
        name: string;
        metadata?: string;
        isSpeaking: boolean;
        connectionQuality: number;
        isLocal?: boolean;
        tracks: {
          kind: any;
          name: any;
          isEnabled: boolean;
        }[];
      }
      
      // Katılımcıları dönüştür
      const participantsData: ParticipantData[] = participants.map((p: LiveKitParticipant) => ({
        identity: p.identity,
        name: p.name || p.identity,
        metadata: p.metadata,
        isSpeaking: p.isSpeaking,
        connectionQuality: p.connectionQuality,
        tracks: Array.from(p.trackPublications.values()).map((t) => ({
          kind: t.kind,
          name: t.trackName,
          isEnabled: !t.isMuted,
        })),
      }));
      
      // Yerel katılımcıyı da ekle
      if (currentRoom.localParticipant) {
        const localParticipant = currentRoom.localParticipant;
        participantsData.push({
          identity: localParticipant.identity,
          name: localParticipant.name || localParticipant.identity,
          metadata: localParticipant.metadata,
          isSpeaking: localParticipant.isSpeaking,
          connectionQuality: localParticipant.connectionQuality,
          isLocal: true,
          tracks: Array.from(localParticipant.trackPublications.values()).map((t) => ({
            kind: t.kind,
            name: t.trackName,
            isEnabled: !t.isMuted,
          })),
        });
      }
      
      return participantsData;
    }
    
    // Eğer bağlı değilsek, API üzerinden katılımcıları al
    console.log('Getting participants from API');
    
    try {
      // Önce session detaylarını al
      const baseUrl = LIVEKIT_PROXY_API_URL.endsWith('/api') ? LIVEKIT_PROXY_API_URL.slice(0, -4) : LIVEKIT_PROXY_API_URL;
      const sessionDetailsResponse = await fetch(`${baseUrl}/api/video-sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!sessionDetailsResponse.ok) {
        throw new Error(`Failed to get session details. Status: ${sessionDetailsResponse.status}`);
      }
      
      const sessionDetails = await sessionDetailsResponse.json();
      console.log('Session details:', sessionDetails);
      
      // Session detaylarından roomName'i al
      const roomName = sessionDetails.roomName || `room_${sessionId}`;
      console.log(`Using room name from session details: ${roomName}`);
      
      // LiveKit API'sine istek gönder - roomName kullanarak
      const response = await fetch(`${LIVEKIT_SERVICE_URL}/participants/${roomName}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`LiveKit API error: Failed to get participants. Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Participants response:', data);
      
      if (!data.participants || data.participants.length === 0) {
        console.log('No participants found in the room');
      }
      
      return data.participants || [];
    } catch (error: any) {
      console.error('Error getting LiveKit participants:', error);
      // Hatayı gizlemek yerine fırlat
      throw new Error(`Failed to get participants: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error getting LiveKit participants:', error);
    // Hatayı gizlemek yerine fırlat
    throw new Error(`Failed to get participants: ${error.message}`);
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
    const response = await fetch(`${LIVEKIT_SERVICE_URL}/end-session`, {
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
      throw new Error(`Failed to end LiveKit session: Status ${response.status}`);
    }
    
    console.log('LiveKit session ended successfully');
  } catch (error: any) {
    console.error('Error ending LiveKit session:', error);
    throw new Error(`Failed to end LiveKit session: ${error.message}`);
  }
};

// Kamera durumunu değiştir
export const toggleCamera = async (enabled: boolean): Promise<void> => {
  try {
    if (!currentRoom || !isConnected) {
      throw new Error('Cannot toggle camera: not connected to a LiveKit room');
    }
    
    const localParticipant = currentRoom.localParticipant;
    if (!localParticipant) {
      throw new Error('Cannot toggle camera: local participant not available');
    }
    
    const videoTracks = Array.from(localParticipant.trackPublications.values())
      .filter((publication) => publication.kind === 'video');
    
    if (videoTracks.length === 0) {
      throw new Error('No video tracks found to toggle');
    }
    
    for (const publication of videoTracks) {
      if (enabled) {
        await publication.unmute();
      } else {
        await publication.mute();
      }
    }
    
    console.log(`Camera ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error: any) {
    console.error('Error toggling camera:', error);
    throw new Error(`Failed to toggle camera: ${error.message}`);
  }
};

// Mikrofon durumunu değiştir
export const toggleMicrophone = async (enabled: boolean): Promise<void> => {
  try {
    if (!currentRoom || !isConnected) {
      throw new Error('Cannot toggle microphone: not connected to a LiveKit room');
    }
    
    const localParticipant = currentRoom.localParticipant;
    if (!localParticipant) {
      throw new Error('Cannot toggle microphone: local participant not available');
    }
    
    const audioTracks = Array.from(localParticipant.trackPublications.values())
      .filter((publication) => publication.kind === 'audio');
    
    if (audioTracks.length === 0) {
      throw new Error('No audio tracks found to toggle');
    }
    
    for (const publication of audioTracks) {
      if (enabled) {
        await publication.unmute();
      } else {
        await publication.mute();
      }
    }
    
    console.log(`Microphone ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error: any) {
    console.error('Error toggling microphone:', error);
    throw new Error(`Failed to toggle microphone: ${error.message}`);
  }
};

// Mevcut oda bağlantısını kontrol et
export const isRoomConnected = (): boolean => {
  return isConnected && currentRoom !== null;
};

// Mevcut odayı al
export const getCurrentRoom = (): LiveKitRoom | null => {
  return currentRoom;
};
