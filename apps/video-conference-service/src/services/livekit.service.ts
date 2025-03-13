import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient, Room } from 'livekit-server-sdk';
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
    this.livekitUrl = this.configService.get<string>('LIVEKIT_URL');
    
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
   * Belirli bir oda için token oluşturur
   */
  generateToken(roomName: string, participantName: string, participantId: string, isTeacher: boolean): string {
    try {
      // Kimlik bilgisini içeren bir JWT token oluştur
      const tokenData = {
        video: {
          room: roomName,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        },
        iss: 'postply',
        sub: participantId,
        name: participantName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 saat
      };
      
      // JWT token oluştur
      const token = jwt.sign(
        tokenData,
        this.apiSecret,
        { algorithm: 'HS256' }
      );
      
      return token;
    } catch (error) {
      console.error('Error generating token:', error);
      throw new Error(`Failed to generate token: ${error.message}`);
    }
  }

  /**
   * Belirli bir odayı sonlandırır
   */
  async endRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
    } catch (error) {
      console.error('Error ending LiveKit room:', error);
      throw new Error(`Failed to end LiveKit room: ${error.message}`);
    }
  }

  /**
   * Odadaki katılımcıları listeler
   */
  async listParticipants(roomName: string): Promise<any[]> {
    try {
      // RoomServiceClient'ta listParticipants metodu yok, bunun yerine listRooms kullanıp
      // ilgili odayı filtreleyebiliriz
      const rooms = await this.roomService.listRooms();
      const room = rooms.find(r => r.name === roomName);
      
      if (!room) {
        return [];
      }
      
      // Gerçek katılımcı listesini alamıyoruz, bu yüzden boş bir dizi döndürüyoruz
      // Bu metodu kullanmak yerine, LiveKit'in WebSocket API'sini kullanmak daha iyi olabilir
      return [];
    } catch (error) {
      console.error('Error listing participants:', error);
      throw new Error(`Failed to list participants: ${error.message}`);
    }
  }
}
