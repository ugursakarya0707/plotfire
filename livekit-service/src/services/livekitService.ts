import { AccessToken, RoomServiceClient, Room, ParticipantInfo } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

// LiveKit yapılandırması
const apiKey = process.env.LIVEKIT_API_KEY || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || '';
const wsUrl = process.env.LIVEKIT_WS_URL || '';

if (!apiKey || !apiSecret || !wsUrl) {
  console.error('LiveKit yapılandırması eksik. Lütfen .env dosyasını kontrol edin.');
  process.exit(1);
}

// LiveKit API URL'sini oluştur (WebSocket URL'sinden)
// wss://postply-s2s0711i.livekit.cloud -> https://postply-s2s0711i.livekit.cloud
const apiUrl = wsUrl.replace('wss://', 'https://');

// RoomService client'ı oluştur (API URL'si ile)
const roomService = new RoomServiceClient(apiUrl, apiKey, apiSecret);

console.log(`LiveKit Service initialized with API URL: ${apiUrl}`);
console.log(`Using LiveKit WebSocket URL: ${wsUrl}`);

// Log seviyesini ayarla (DEBUG, INFO, WARN, ERROR)
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';

// Log fonksiyonları
const logDebug = (message: string) => {
  if (LOG_LEVEL === 'DEBUG') {
    console.log(`[DEBUG] ${message}`);
  }
};

const logInfo = (message: string) => {
  if (LOG_LEVEL === 'DEBUG' || LOG_LEVEL === 'INFO') {
    console.log(`[INFO] ${message}`);
  }
};

const logWarn = (message: string) => {
  if (LOG_LEVEL === 'DEBUG' || LOG_LEVEL === 'INFO' || LOG_LEVEL === 'WARN') {
    console.warn(`[WARN] ${message}`);
  }
};

const logError = (message: string, error?: any) => {
  console.error(`[ERROR] ${message}`);
  if (error) {
    console.error(error);
  }
};

/**
 * Belirli bir oda için token oluşturur
 * @param roomName Oda adı
 * @param participantName Katılımcı adı
 * @param isTeacher Öğretmen mi?
 * @returns Token
 */
export const createToken = (roomName: string, participantName: string, isTeacher: boolean): string => {
  // Katılımcı metadata'sı
  const metadata = JSON.stringify({
    name: participantName,
    role: isTeacher ? 'teacher' : 'student',
    isTeacher: isTeacher
  });

  // Token oluştur
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    metadata: metadata
  });

  // Token'a oda izinleri ekle
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isTeacher,
    roomCreate: isTeacher
  });

  // Token'ı döndür
  return token.toJwt();
};

/**
 * Oda yoksa oluşturur, varsa mevcut odayı döndürür
 * @param roomName Oda adı
 * @returns Oda bilgisi
 */
export const createRoomIfNotExists = async (roomName: string): Promise<Room> => {
  try {
    // Oda var mı kontrol et
    const rooms = await roomService.listRooms();
    const existingRoom = rooms.find(room => room.name === roomName);

    if (existingRoom) {
      logInfo(`Oda zaten mevcut: ${roomName}`);
      return existingRoom;
    }

    // Oda yoksa oluştur
    const room = await roomService.createRoom({
      name: roomName,
      emptyTimeout: 60 * 30, // 30 dakika
      maxParticipants: 2 // Sadece öğretmen ve öğrenci
    });

    logInfo(`Oda oluşturuldu: ${roomName}`);
    return room;
  } catch (error) {
    logError(`Oda oluşturma hatası: ${error}`);
    throw error;
  }
};

/**
 * Odanın var olup olmadığını kontrol eder
 * @param roomName Oda adı
 * @returns Oda var mı?
 */
export const checkRoomExists = async (roomName: string): Promise<boolean> => {
  try {
    const rooms = await roomService.listRooms();
    return rooms.some(room => room.name === roomName);
  } catch (error) {
    logError(`Oda kontrolü hatası: ${error}`);
    return false;
  }
};

/**
 * Odadaki katılımcıları listeler
 * @param roomName Oda adı
 * @returns Katılımcı listesi
 */
export const getParticipants = async (roomName: string): Promise<ParticipantInfo[]> => {
  try {
    logDebug(`Katılımcılar isteniyor: Oda adı=${roomName}`);
    
    // Doğrudan LiveKit Cloud API'sini kullanarak odaları listele
    const rooms = await roomService.listRooms();
    logDebug(`Mevcut odalar: ${rooms.map(r => r.name).join(', ')}`);
    
    const room = rooms.find(r => r.name === roomName);
    
    if (!room) {
      logWarn(`Oda bulunamadı: ${roomName}`);
      return [];
    }
    
    logDebug(`Oda bulundu: ${roomName}, SID: ${room.sid}, Katılımcı sayısı: ${room.numParticipants}`);
    
    // Eğer odada katılımcı yoksa, boş dizi döndür
    if (room.numParticipants === 0) {
      logWarn(`Odada katılımcı yok: ${roomName}`);
      return [];
    }
    
    try {
      // Katılımcıları oda SID ile alalım
      const participants = await roomService.listParticipants(room.sid);
      
      logInfo(`Katılımcı sayısı: ${participants.length} (Oda: ${roomName})`);
      
      if (LOG_LEVEL === 'DEBUG') {
        participants.forEach((p, i) => {
          logDebug(`Katılımcı ${i+1}: ID=${p.identity}, State=${p.state}, Metadata=${p.metadata || 'Yok'}`);
        });
      }
      
      return participants;
    } catch (error: any) {
      logError(`Katılımcı listesi alınamadı (SID: ${room.sid}): ${error.message}`, error);
      
      // Hata durumunda 1 saniye bekleyip tekrar dene
      logWarn(`Katılımcı listesi alınamadı, 1 saniye bekleyip tekrar deneniyor...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Tekrar dene
        const retryParticipants = await roomService.listParticipants(room.sid);
        logInfo(`Yeniden deneme başarılı, katılımcı sayısı: ${retryParticipants.length}`);
        return retryParticipants;
      } catch (retryError: any) {
        logError(`Yeniden deneme başarısız: ${retryError.message}`, retryError);
        return [];
      }
    }
  } catch (error: any) {
    logError(`Katılımcı listesi alınamadı: ${roomName}`, error);
    return [];
  }
};

/**
 * Odayı sonlandırır
 * @param roomName Oda adı
 * @returns İşlem başarılı mı?
 */
export const endRoom = async (roomName: string): Promise<boolean> => {
  try {
    await roomService.deleteRoom(roomName);
    logInfo(`Oda sonlandırıldı: ${roomName}`);
    return true;
  } catch (error) {
    logError(`Oda sonlandırma hatası: ${error}`);
    return false;
  }
};

export default {
  createToken,
  createRoomIfNotExists,
  checkRoomExists,
  getParticipants,
  endRoom
};
