/**
 * LiveKit Cloud bağlantısını test etmek için basit bir script
 * Bu script, LiveKit Cloud'a bağlanır, bir oda oluşturur ve token üretir
 */

import { ConfigService } from '@nestjs/config';
import { RoomServiceClient } from 'livekit-server-sdk';
import * as jwt from 'jsonwebtoken';

// Manuel olarak config değerlerini ayarlayın
const config = {
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || 'APIP2e8PX6AbSkQ',
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || 'B4ywBpfTlaHL4T8EW2fU1mvuDxKTIwaXoSHIYeEJpOQB',
  LIVEKIT_URL: process.env.LIVEKIT_URL || 'wss://postply-s2s0711i.livekit.cloud',
};

async function testLiveKitConnection() {
  console.log('LiveKit Cloud bağlantı testi başlatılıyor...');
  console.log(`LiveKit Host: ${config.LIVEKIT_URL}`);
  
  try {
    // RoomServiceClient oluştur
    const roomService = new RoomServiceClient(
      config.LIVEKIT_URL,
      config.LIVEKIT_API_KEY,
      config.LIVEKIT_API_SECRET
    );
    
    // Test odası oluştur
    const roomName = `test-room-${Date.now()}`;
    console.log(`Test odası oluşturuluyor: ${roomName}`);
    
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 10 * 60, // 10 dakika
      maxParticipants: 2,
    });
    
    console.log(`Oda başarıyla oluşturuldu: ${roomName}`);
    
    // Öğrenci ve öğretmen için token oluştur
    const studentToken = generateToken(roomName, 'test-student', false);
    const teacherToken = generateToken(roomName, 'test-teacher', true);
    
    console.log('Öğrenci token:', studentToken.substring(0, 20) + '...');
    console.log('Öğretmen token:', teacherToken.substring(0, 20) + '...');
    
    // Oda listesini al
    const rooms = await roomService.listRooms();
    console.log(`Mevcut odalar (${rooms.length}):`);
    rooms.forEach((room, i) => {
      console.log(`${i+1}. ${room.name} (${room.numParticipants} katılımcı)`);
    });
    
    console.log('LiveKit Cloud bağlantı testi başarılı!');
    return { success: true, roomName, studentToken, teacherToken };
  } catch (error) {
    console.error('LiveKit Cloud bağlantı testi başarısız:', error);
    return { success: false, error: error.message };
  }
}

function generateToken(roomName: string, userName: string, isTeacher: boolean): string {
  try {
    console.log(`Token üretiliyor: ${userName}, Oda: ${roomName}, Öğretmen mi: ${isTeacher}`);
    
    // Token için gerekli bilgileri hazırla
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 24 * 60 * 60; // 24 saat geçerli
    
    // Kullanıcı kimliğini normalize et
    const normalizedIdentity = userName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // JWT için payload hazırla
    const payload = {
      iss: config.LIVEKIT_API_KEY,
      sub: normalizedIdentity,
      exp: exp,
      nbf: now,
      jti: `${roomName}-${normalizedIdentity}-${now}`,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomAdmin: true, // Her iki rol için de admin yetkisi
        roomCreate: true, // Her iki rol için de oda oluşturma yetkisi
      },
      metadata: JSON.stringify({
        name: userName,
        role: isTeacher ? 'teacher' : 'student',
        isTeacher: isTeacher
      })
    };
    
    // JWT token oluştur
    return jwt.sign(payload, config.LIVEKIT_API_SECRET, { algorithm: 'HS256' });
  } catch (error) {
    console.error('Token üretim hatası:', error);
    throw error;
  }
}

// Script doğrudan çalıştırıldığında testi başlat
if (require.main === module) {
  testLiveKitConnection()
    .then(result => {
      if (result.success) {
        console.log('Test başarılı!');
      } else {
        console.error('Test başarısız!');
      }
    })
    .catch(error => {
      console.error('Test sırasında hata oluştu:', error);
    });
}

export { testLiveKitConnection };
