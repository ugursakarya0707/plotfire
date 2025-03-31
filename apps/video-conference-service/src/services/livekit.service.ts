import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoomServiceClient, Room } from 'livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class LiveKitService {
  private roomService: RoomServiceClient;
  private apiKey: string;
  private apiSecret: string;
  private livekitUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY');
    this.apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET');
    this.livekitUrl = this.configService.get<string>('LIVEKIT_URL') || 'wss://postply-s2s0711i.livekit.cloud';
    
    console.log(`LiveKit service initialized with URL: ${this.livekitUrl}`);
    
    this.roomService = new RoomServiceClient(
      this.livekitUrl,
      this.apiKey,
      this.apiSecret,
    );
  }

  /**
   * Yeni bir oda oluşturur
   */
  async createRoom(roomName: string = null): Promise<Room> {
    // Oda adı belirtilmemişse otomatik oluştur
    if (!roomName) {
      roomName = `room_${uuidv4()}`;
    }
    
    try {
      const room = await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 60 * 30, // 30 dakika
        maxParticipants: 2, // Sadece öğretmen ve öğrenci
      });
      
      return room;
    } catch (error) {
      console.error('Error creating LiveKit room:', error);
      throw new Error(`Failed to create LiveKit room: ${error.message}`);
    }
  }

  /**
   * Öğretmen için token oluşturur
   * Öğretmenler için tam yetkilendirme (yayın yapabilir, izleyebilir, veri paylaşabilir)
   */
  generateTeacherToken(roomName: string, participantName: string, participantId: string): string {
    try {
      console.log(`Generating teacher token for room: ${roomName}, participant: ${participantName}`);
      
      // Öğretmen için JWT token oluştur - LiveKit Cloud formatında
      const tokenData = {
        video: {
          roomCreate: true,
          roomJoin: true,
          roomAdmin: true,
          room: roomName,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        },
        iss: this.apiKey,
        sub: participantId,
        name: participantName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 saat
        metadata: JSON.stringify({ role: 'teacher' })
      };
      
      // JWT token oluştur
      const token = jwt.sign(tokenData, this.apiSecret, { algorithm: 'HS256' });
      console.log(`Teacher token generated successfully for ${participantName}`);
      return token;
    } catch (error) {
      console.error('Error generating teacher token:', error);
      throw new Error(`Failed to generate teacher token: ${error.message}`);
    }
  }

  /**
   * Öğrenci için token oluşturur
   * Öğrenciler için yetkilendirme (yayın yapabilir, izleyebilir, veri paylaşabilir)
   */
  generateStudentToken(roomName: string, participantName: string, participantId: string): string {
    try {
      console.log(`Generating student token for room: ${roomName}, participant: ${participantName}`);
      
      // Öğrenci için JWT token oluştur - LiveKit Cloud formatında
      const tokenData = {
        video: {
          roomJoin: true,
          room: roomName,
          canPublish: true, // Öğrencilerin de kamera ve mikrofon paylaşabilmesine izin ver
          canSubscribe: true,
          canPublishData: true
        },
        iss: this.apiKey,
        sub: participantId,
        name: participantName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 saat
        metadata: JSON.stringify({ role: 'student' })
      };
      
      // JWT token oluştur
      const token = jwt.sign(tokenData, this.apiSecret, { algorithm: 'HS256' });
      console.log(`Student token generated successfully for ${participantName}`);
      return token;
    } catch (error) {
      console.error('Error generating student token:', error);
      throw new Error(`Failed to generate student token: ${error.message}`);
    }
  }

  /**
   * Belirli bir oda için token oluşturur (eski metod - geriye uyumluluk için)
   */
  generateToken(roomName: string, participantName: string, participantId: string, isTeacher: boolean): string {
    if (isTeacher) {
      return this.generateTeacherToken(roomName, participantName, participantId);
    } else {
      return this.generateStudentToken(roomName, participantName, participantId);
    }
  }

  /**
   * Belirli bir odayı sonlandırır
   */
  async endRoom(roomName: string): Promise<void> {
    try {
      await this.deleteRoom(roomName);
    } catch (error) {
      console.error('Error ending LiveKit room:', error);
      throw new Error(`Failed to end LiveKit room: ${error.message}`);
    }
  }

  /**
   * Belirli bir odayı siler
   */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      console.log(`Deleting LiveKit room: ${roomName}`);
      await this.roomService.deleteRoom(roomName);
      console.log(`LiveKit room ${roomName} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting LiveKit room: ${error.message}`);
      throw new Error(`Failed to delete LiveKit room: ${error.message}`);
    }
  }
  
  /**
   * Odadaki katılımcıları listeler
   * Not: LiveKit SDK 1.2.7 sürümünde doğrudan katılımcıları listelemek için bir metot bulunmuyor.
   * Bu nedenle şu anda boş bir dizi döndürüyoruz.
   */
  async listParticipants(roomName: string): Promise<any[]> {
    try {
      console.log(`Listing participants for room: ${roomName}`);
      console.log(`Note: Direct participant listing is not supported in the current LiveKit SDK version.`);
      
      // Odanın var olup olmadığını kontrol et
      const rooms = await this.roomService.listRooms();
      const roomExists = rooms.some(room => room.name === roomName);
      
      if (!roomExists) {
        console.log(`Room ${roomName} not found, returning empty array`);
        return [];
      }
      
      // LiveKit SDK 1.2.7 sürümünde doğrudan katılımcıları listelemek için bir metot yok
      // Bu nedenle boş bir dizi döndürüyoruz
      console.log(`Room ${roomName} exists, but participant listing is not directly supported`);
      return [];
    } catch (error) {
      console.error(`Error listing participants: ${error.message}`);
      // Hata durumunda boş dizi döndür
      return [];
    }
  }
}
