import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { RoomServiceClient, Room, ParticipantInfo } from 'livekit-server-sdk';
import { HttpService } from '@nestjs/axios';
import { McpService } from '../mcp/mcp.service';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LiveKitProxyService {
  private readonly logger = new Logger(LiveKitProxyService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly livekitHost: string;
  private readonly videoConferenceApiUrl: string;
  
  private roomService: RoomServiceClient;
  private httpService: HttpService;
  
  constructor(
    httpService: HttpService,
    private readonly mcpService: McpService,
    private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY', 'devkey');
    this.apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET', 'devsecret');
    this.livekitHost = this.configService.get<string>('LIVEKIT_URL', 'wss://postply-s2s0711i.livekit.cloud');
    this.videoConferenceApiUrl = this.configService.get<string>('VIDEO_CONFERENCE_API_URL', 'http://localhost:3000/api');
    
    this.roomService = new RoomServiceClient(this.livekitHost, this.apiKey, this.apiSecret);
    this.httpService = httpService;
    this.logger.log(`LiveKit proxy service initialized with host: ${this.livekitHost}`);
  }
  
  /**
   * LiveKit oturumu başlatır ve token döndürür
   */
  async initializeSession(sessionId: string, userName: string, isTeacher: boolean): Promise<string> {
    try {
      this.logger.log(`Initializing LiveKit session for ${userName} in room ${sessionId}`);
      
      // Oda adı olarak doğrudan sessionId kullan, özel formatlama yapma
      // Bu sayede öğrenci ve öğretmen aynı odaya bağlanabilir
      const roomName = sessionId;
      
      this.logger.log(`Using room name: ${roomName} for both teacher and student`);
      
      // Oda yoksa oluştur
      await this.createRoomIfNotExists(roomName);
      
      // Token oluştur
      const token = this.generateToken(roomName, userName, isTeacher);
      
      this.logger.log(`LiveKit token generated for ${userName}`);
      return token;
    } catch (error) {
      this.logger.error(`Error initializing LiveKit session: ${error.message}`, error.stack);
      
      // MCP ile sorunu çözmeyi dene
      try {
        await this.useMcpToSolveProblem(sessionId, userName, error.message);
      } catch (mcpError) {
        this.logger.warn(`MCP could not solve the issue: ${mcpError.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Oda yoksa oluşturur
   */
  private async createRoomIfNotExists(roomName: string): Promise<Room> {
    try {
      // Odayı kontrol et
      const rooms = await this.roomService.listRooms();
      const existingRoom = rooms.find(room => room.name === roomName);
      
      if (existingRoom) {
        this.logger.log(`Room ${roomName} already exists`);
        return existingRoom;
      }
      
      // Oda yoksa oluştur
      const room = await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 60 * 60, // 1 saat
        maxParticipants: 10,
      });
      
      this.logger.log(`Created new room: ${roomName}`);
      return room;
    } catch (error) {
      this.logger.error(`Error creating room: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * LiveKit token oluşturur
   */
  private generateToken(roomName: string, userName: string, isTeacher: boolean): string {
    try {
      this.logger.log(`Generating token for ${userName} in room ${roomName}, isTeacher: ${isTeacher}`);
      
      // Token için gerekli bilgileri hazırla
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 24 * 60 * 60; // 24 saat geçerli
      
      // JWT için payload hazırla
      const payload = {
        iss: this.apiKey,
        sub: userName,
        exp: exp,
        nbf: now,
        jti: `${roomName}-${userName}-${now}`,
        video: {
          room: roomName,
          roomJoin: true,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
          roomAdmin: isTeacher,
          roomCreate: isTeacher,
        },
        metadata: JSON.stringify({
          name: userName,
          role: isTeacher ? 'teacher' : 'student',
          isTeacher: isTeacher
        })
      };
      
      // JWT token oluştur
      const token = jwt.sign(payload, this.apiSecret, { algorithm: 'HS256' });
      
      this.logger.log(`Token generated successfully for ${userName}`);
      return token;
    } catch (error) {
      this.logger.error(`Error generating token: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to generate token: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  /**
   * Odadaki katılımcıları döndürür
   */
  async getParticipants(roomName: string): Promise<any[]> {
    try {
      this.logger.log(`Getting participants for room ${roomName}`);
      
      // Tüm odaları listele ve doğru odayı bul
      try {
        const rooms = await this.roomService.listRooms();
        this.logger.log(`Available rooms: ${rooms.map(r => r.name).join(', ')}`);
        
        // Önce doğrudan eşleşmeyi dene
        let targetRoom = rooms.find(r => r.name === roomName);
        
        // Doğrudan eşleşme yoksa, içeren odaları kontrol et
        if (!targetRoom) {
          // Özel formatlı oda adlarını kontrol et (room_ID_timestamp formatı)
          const roomWithPrefix = rooms.find(r => 
            r.name.includes(`room_`) && r.name.includes(roomName)
          );
          
          if (roomWithPrefix) {
            targetRoom = roomWithPrefix;
            this.logger.log(`Found room with prefix: ${targetRoom.name}`);
          } else {
            // Herhangi bir şekilde roomName'i içeren odaları kontrol et
            const roomContainingId = rooms.find(r => r.name.includes(roomName));
            if (roomContainingId) {
              targetRoom = roomContainingId;
              this.logger.log(`Found room containing ID: ${targetRoom.name}`);
            }
          }
        }
        
        if (!targetRoom) {
          this.logger.warn(`Room ${roomName} not found in available rooms`);
          return [];
        }
        
        this.logger.log(`Found matching room: ${targetRoom.name}`);
        
        // Bulunan odadaki katılımcıları listele
        const participants = await this.roomService.listParticipants(targetRoom.name);
        
        // Katılımcı bilgilerini dönüştür
        return participants.map(participant => {
          // Metadata kontrolü - eğer JSON string ise parse et
          let userType = 'student';
          try {
            if (participant.metadata && typeof participant.metadata === 'string') {
              // Eğer JSON formatında ise parse et
              if (participant.metadata.startsWith('{')) {
                const metadataObj = JSON.parse(participant.metadata);
                userType = metadataObj.isTeacher || metadataObj.role === 'teacher' ? 'teacher' : 'student';
              } else if (participant.metadata.includes('teacher')) {
                userType = 'teacher';
              }
            }
          } catch (e) {
            this.logger.warn(`Error parsing metadata for participant ${participant.identity}: ${e.message}`);
          }

          return {
            id: participant.identity,
            name: participant.name || participant.identity,
            type: userType,
            status: 'active',
            streamUrl: this.getStreamUrl(targetRoom.name, participant),
          };
        });
      } catch (error) {
        // LiveKit Cloud ile çalışırken, listParticipants API'si 404 hatası verebilir
        // Eğer oda henüz oluşturulmamışsa veya katılımcı yoksa
        this.logger.warn(`Error listing participants for room ${roomName}: ${error.message}`);
        return [];
      }
    } catch (error) {
      this.logger.error(`Error getting participants: ${error.message}`, error.stack);
      return [];
    }
  }
  
  /**
   * Katılımcının stream URL'ini oluşturur
   */
  private getStreamUrl(roomName: string, participant: ParticipantInfo): string {
    // Bu örnek için basit bir URL oluşturuyoruz
    // Gerçek uygulamada LiveKit'in WebRTC stream URL'lerini kullanabilirsiniz
    return `${this.livekitHost}/stream/${roomName}/${participant.identity}`;
  }
  
  /**
   * Odayı sonlandırır
   */
  async endSession(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
      this.logger.log(`Room ${roomName} deleted`);
    } catch (error) {
      this.logger.error(`Error ending session: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Katılımcının kamera durumunu değiştirir
   */
  async toggleCamera(roomName: string, identity: string, enabled: boolean): Promise<void> {
    try {
      // Önce mevcut katılımcı bilgilerini al
      const participants = await this.roomService.listParticipants(roomName);
      const participant = participants.find(p => p.identity === identity);
      
      if (!participant) {
        throw new Error(`Participant ${identity} not found in room ${roomName}`);
      }
      
      // Mevcut metadata'yı parse et veya yeni oluştur
      let metadata = {};
      try {
        if (participant.metadata && typeof participant.metadata === 'string' && participant.metadata.startsWith('{')) {
          metadata = JSON.parse(participant.metadata);
        }
      } catch (e) {
        this.logger.warn(`Error parsing existing metadata: ${e.message}`);
      }
      
      // Kamera durumunu güncelle
      metadata = { ...metadata, cameraEnabled: enabled };
      
      // Katılımcıyı güncelle - güncel API'ye göre düzeltildi
      await this.roomService.updateParticipant(
        roomName, 
        identity, 
        JSON.stringify(metadata)
      );
      
      this.logger.log(`Camera ${enabled ? 'enabled' : 'disabled'} for ${identity} in room ${roomName}`);
    } catch (error) {
      this.logger.error(`Error toggling camera: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Katılımcının mikrofon durumunu değiştirir
   */
  async toggleMicrophone(roomName: string, identity: string, enabled: boolean): Promise<void> {
    try {
      // Önce mevcut katılımcı bilgilerini al
      const participants = await this.roomService.listParticipants(roomName);
      const participant = participants.find(p => p.identity === identity);
      
      if (!participant) {
        throw new Error(`Participant ${identity} not found in room ${roomName}`);
      }
      
      // Mevcut metadata'yı parse et veya yeni oluştur
      let metadata = {};
      try {
        if (participant.metadata && typeof participant.metadata === 'string' && participant.metadata.startsWith('{')) {
          metadata = JSON.parse(participant.metadata);
        }
      } catch (e) {
        this.logger.warn(`Error parsing existing metadata: ${e.message}`);
      }
      
      // Mikrofon durumunu güncelle
      metadata = { ...metadata, micEnabled: enabled };
      
      // Katılımcıyı güncelle - güncel API'ye göre düzeltildi
      await this.roomService.updateParticipant(
        roomName, 
        identity, 
        JSON.stringify(metadata)
      );
      
      this.logger.log(`Microphone ${enabled ? 'enabled' : 'disabled'} for ${identity} in room ${roomName}`);
    } catch (error) {
      this.logger.error(`Error toggling microphone: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * LiveKit bağlantısını başlat
   */
  async connectToLiveKit(sessionId: string, userName: string, role: string): Promise<any> {
    try {
      this.logger.log(`Connecting to LiveKit for session ${sessionId} as ${role} ${userName}`);
      
      // LiveKit oturumunu doğrudan başlat
      const isTeacher = role === 'teacher';
      
      // Önce mevcut odaları kontrol et
      const rooms = await this.roomService.listRooms();
      this.logger.log(`Available rooms: ${rooms.map(r => r.name).join(', ')}`);
      
      let roomName = sessionId;
      
      // Eğer öğretmense, önce doğrudan sessionId ile oda var mı diye kontrol et, sonra öğrencinin bulunduğu odayı bul
      if (isTeacher) {
        // Önce doğrudan sessionId ile oda var mı diye kontrol et
        const directRoom = rooms.find(r => r.name === sessionId);
        
        if (directRoom) {
          roomName = directRoom.name;
          this.logger.log(`Teacher joining room with direct sessionId: ${roomName}`);
        } else {
          // Öğrenci formatındaki oda adını ara (room_XXXX formatı)
          const studentRoom = rooms.find(r => 
            r.name.includes(`room_`) && r.name.includes(sessionId)
          );
          
          if (studentRoom) {
            roomName = studentRoom.name;
            this.logger.log(`Teacher joining student's room: ${roomName}`);
          } else {
            this.logger.log(`No student room found, using default room name: ${roomName}`);
          }
        }
      } else {
        // Öğrenci için oda adı olarak doğrudan sessionId kullan
        // Geriye uyumluluk için eski formatı kontrol et, ancak yeni oturumlar için sessionId kullan
        const existingRoom = rooms.find(r => r.name === sessionId);
        
        if (existingRoom) {
          this.logger.log(`Student joining existing room with sessionId: ${roomName}`);
        } else {
          this.logger.log(`Student creating new room with sessionId: ${roomName}`);
        }
      }
      
      // Oturum başlat ve token al
      const token = await this.initializeSession(roomName, userName, isTeacher);
      
      this.logger.log(`LiveKit token generated for ${userName} in session ${sessionId}, using room: ${roomName}`);
      
      return { 
        token,
        roomName,
        userName,
        role
      };
    } catch (error) {
      this.logger.error(`Error connecting to LiveKit: ${error.message}`, error.stack);
      
      // HTTP hata durumunda
      if (error.response) {
        const { status, data } = error.response;
        this.logger.error(`LiveKit connection error: Status ${status}, Response:`, data);
      }
      
      throw error;
    }
  }

  /**
   * Token oluşturur - controller tarafından çağrılır
   */
  async createToken(roomName: string, participantName: string, isTeacher: boolean): Promise<string> {
    return this.initializeSession(roomName, participantName, isTeacher);
  }
  
  /**
   * MCP ile video konferans sorununu çözmeyi dener
   */
  private async useMcpToSolveProblem(sessionId: string, userName: string, errorMessage: string) {
    try {
      this.logger.log(`Using MCP to solve problem for session ${sessionId}`);
      
      // MCP problem çözme sürecini başlat
      const result = await this.mcpService.solveVideoConferenceConnectionIssue(
        sessionId,
        errorMessage,
        {
          userName,
          livekitHost: this.livekitHost,
          apiKey: this.apiKey,
          timestamp: new Date().toISOString()
        }
      );
      
      this.logger.log(`MCP problem solving result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error using MCP to solve problem: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Bağlantı sorununu düzeltmek için MCP çözümünü uygular
   */
  async applyMcpSolution(sessionId: string, solution: any) {
    try {
      this.logger.log(`Applying MCP solution for session ${sessionId}`);
      
      // Çözüm tipine göre işlem yap
      if (solution.type === 'reconnect') {
        // Odayı yeniden oluştur
        await this.createRoomIfNotExists(sessionId);
        return { status: 'reconnected', sessionId };
      } else if (solution.type === 'token') {
        // Yeni token oluştur
        const newToken = this.generateToken(sessionId, solution.userName, solution.isTeacher);
        return { status: 'new_token', token: newToken };
      } else if (solution.type === 'config') {
        // Konfigürasyon değişikliği
        return { status: 'config_updated', config: solution.config };
      }
      
      return { status: 'no_action', message: 'No applicable solution found' };
    } catch (error) {
      this.logger.error(`Error applying MCP solution: ${error.message}`, error.stack);
      throw error;
    }
  }
}
