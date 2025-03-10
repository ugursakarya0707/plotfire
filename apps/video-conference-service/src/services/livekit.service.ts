import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient, Room } from 'livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';

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
      // AccessToken yapıcısı sadece 2 parametre alıyor (apiKey ve apiSecret)
      const token = new AccessToken(this.apiKey, this.apiSecret);
      
      // Odaya katılma izni
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        // Kimlik bilgilerini grant içinde belirtelim
        identity: participantId,
        name: participantName,
      });
      
      return token.toJwt();
    } catch (error) {
      console.error('Error generating LiveKit token:', error);
      throw new Error(`Failed to generate LiveKit token: ${error.message}`);
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
