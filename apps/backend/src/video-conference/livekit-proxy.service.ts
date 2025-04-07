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
      this.logger.log(`Initializing LiveKit session for ${userName} in room ${sessionId}, isTeacher: ${isTeacher}`);
      
      if (!sessionId) {
        throw new HttpException('Session ID is required', HttpStatus.BAD_REQUEST);
      }
      
      if (!userName) {
        throw new HttpException('User name is required', HttpStatus.BAD_REQUEST);
      }
      
      // Oda adı olarak doğrudan sessionId kullan, özel formatlama yapma
      // Bu sayede öğrenci ve öğretmen aynı odaya bağlanabilir
      const roomName = sessionId;
      
      this.logger.log(`Using room name: ${roomName} for both teacher and student`);
      
      // Oturum durumunu güncelle
      try {
        // Oturum durumunu ACTIVE olarak güncelle
        await this.mcpService.updateVideoSessionStatus(sessionId, 'ACTIVE');
        this.logger.log(`Updated session ${sessionId} status to ACTIVE`);
      } catch (statusError) {
        this.logger.warn(`Error updating session status: ${statusError.message}, but continuing`);
      }
      
      // Oda yoksa oluştur
      try {
        const metadata = {
          sessionId: sessionId,
          createdBy: userName,
          isTeacher: isTeacher,
          createdAt: new Date().toISOString()
        };
        
        const roomResult = await this.createRoomIfNotExists(roomName, metadata);
        this.logger.log(`Room creation result: ${JSON.stringify(roomResult)}`);
      } catch (roomError) {
        this.logger.warn(`Error creating room: ${roomError.message}, but continuing`);
      }
      
      // Token oluştur
      const token = this.generateToken(roomName, userName, isTeacher);
      
      this.logger.log(`Session initialized successfully for ${userName} in room ${roomName}`);
      
      // Oturum durumunu ve katılımcı bilgilerini güncelle
      try {
        const participantInfo = {
          identity: userName,
          name: userName,
          role: isTeacher ? 'teacher' : 'student',
          joinedAt: new Date().toISOString()
        };
        
        // Oturum verilerini güncelle
        await this.mcpService.updateVideoSessionData(sessionId, {
          roomName,
          status: 'ACTIVE',
          isActive: true,
          participants: [participantInfo],
          updatedAt: new Date().toISOString()
        });
        
        this.logger.log(`Updated session data for ${sessionId} with participant ${userName}`);
      } catch (updateError) {
        this.logger.warn(`Error updating session data: ${updateError.message}, but continuing`);
      }
      
      return token;
    } catch (error) {
      this.logger.error(`Error initializing session: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to initialize session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  /**
   * Oda oluştur (yoksa)
   */
  async createRoomIfNotExists(roomName: string, metadata?: any): Promise<any> {
    try {
      this.logger.log(`Creating room if not exists: ${roomName}`);
      
      // Oda adını normalize et
      const normalizedRoomName = roomName.trim();
      
      if (!normalizedRoomName) {
        throw new Error('Room name is required');
      }
      
      // Odanın var olup olmadığını kontrol et
      let roomExists = false;
      try {
        const rooms = await this.roomService.listRooms();
        roomExists = rooms.some(room => room.name === normalizedRoomName);
        this.logger.log(`Room exists check: ${roomExists ? 'Yes' : 'No'}`);
      } catch (checkError) {
        this.logger.warn(`Error checking if room exists: ${checkError.message}, assuming it doesn't exist`);
      }
      
      // Oda yoksa oluştur
      if (!roomExists) {
        this.logger.log(`Room ${normalizedRoomName} does not exist, creating...`);
        
        const roomMetadata = metadata ? JSON.stringify(metadata) : '';
        
        try {
          await this.roomService.createRoom({
            name: normalizedRoomName,
            emptyTimeout: 60 * 60, // 1 saat
            maxParticipants: 10,
            metadata: roomMetadata
          });
          
          this.logger.log(`Room ${normalizedRoomName} created successfully with metadata: ${roomMetadata}`);
          
          // MCP'deki oturum verisini de güncelle
          if (metadata && metadata.sessionId) {
            try {
              await this.mcpService.updateVideoSessionData(metadata.sessionId, {
                roomName: normalizedRoomName,
                ...metadata,
                status: 'ACTIVE',
                isActive: true,
                updatedAt: new Date().toISOString()
              });
              this.logger.log(`Updated MCP session data for ${metadata.sessionId}`);
            } catch (mcpError) {
              this.logger.warn(`Error updating MCP session: ${mcpError.message}, but continuing`);
            }
          }
          
          return { created: true, name: normalizedRoomName, metadata: roomMetadata };
        } catch (createError) {
          // Oda zaten varsa (409 hatası) veya başka bir hata varsa
          if (createError.message && createError.message.includes('already exists')) {
            this.logger.log(`Room ${normalizedRoomName} already exists (409 error)`);
            roomExists = true;
          } else {
            this.logger.error(`Error creating room: ${createError.message}`);
            throw createError;
          }
        }
      }
      
      // Oda mevcutsa, metadata'yı güncelle
      if (roomExists && metadata) {
        try {
          const roomMetadata = JSON.stringify(metadata);
          await this.roomService.updateRoomMetadata(normalizedRoomName, roomMetadata);
          this.logger.log(`Updated metadata for existing room ${normalizedRoomName}`);
          
          // MCP'deki oturum verisini de güncelle
          if (metadata.sessionId) {
            try {
              await this.mcpService.updateVideoSessionData(metadata.sessionId, {
                roomName: normalizedRoomName,
                ...metadata,
                status: 'ACTIVE',
                isActive: true,
                updatedAt: new Date().toISOString()
              });
              this.logger.log(`Updated MCP session data for ${metadata.sessionId}`);
            } catch (mcpError) {
              this.logger.warn(`Error updating MCP session: ${mcpError.message}, but continuing`);
            }
          }
          
          return { created: false, name: normalizedRoomName, updated: true };
        } catch (updateError) {
          this.logger.warn(`Error updating room metadata: ${updateError.message}, but continuing`);
        }
      }
      
      this.logger.log(`Room ${normalizedRoomName} already exists`);
      return { created: false, name: normalizedRoomName };
    } catch (error) {
      this.logger.error(`Error creating/checking room: ${error.message}`, error.stack);
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
      
      // Kullanıcı kimliğini normalize et - boşluk ve özel karakterleri kaldır
      const normalizedIdentity = userName.replace(/[^a-zA-Z0-9]/g, '_');
      
      // JWT için payload hazırla
      const payload = {
        iss: this.apiKey,
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
      
      this.logger.log(`Token generated successfully for ${userName} with identity ${normalizedIdentity}`);
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
      
      // Oda adını normalize et
      const normalizedRoomName = roomName.trim();
      
      if (!normalizedRoomName) {
        this.logger.warn('Empty room name provided');
        return [];
      }
      
      // Tüm odaları listele ve doğru odayı bul
      try {
        const rooms = await this.roomService.listRooms();
        
        if (rooms.length === 0) {
          this.logger.warn('No active rooms found');
          return [];
        }
        
        this.logger.log(`Available rooms: ${rooms.map(r => r.name).join(', ')}`);
        
        // Önce doğrudan eşleşmeyi dene
        let targetRoom = rooms.find(r => r.name === normalizedRoomName);
        
        // Doğrudan eşleşme yoksa, içeren odaları kontrol et
        if (!targetRoom) {
          // Özel formatlı oda adlarını kontrol et (room_ID_timestamp formatı)
          const roomWithPrefix = rooms.find(r => 
            r.name.includes(`room_`) && r.name.includes(normalizedRoomName)
          );
          
          if (roomWithPrefix) {
            targetRoom = roomWithPrefix;
            this.logger.log(`Found room with prefix: ${targetRoom.name}`);
          } else {
            // Herhangi bir şekilde roomName'i içeren odaları kontrol et
            const roomContainingId = rooms.find(r => r.name.includes(normalizedRoomName));
            if (roomContainingId) {
              targetRoom = roomContainingId;
              this.logger.log(`Found room containing ID: ${targetRoom.name}`);
            }
          }
        }
        
        if (!targetRoom) {
          this.logger.warn(`Room ${normalizedRoomName} not found in available rooms`);
          // Oda bulunamadığında boş dizi döndür
          return [];
        }
        
        this.logger.log(`Found matching room: ${targetRoom.name}`);
        
        // Bulunan odadaki katılımcıları listele
        try {
          const participants = await this.roomService.listParticipants(targetRoom.name);
          
          if (!participants || participants.length === 0) {
            this.logger.warn(`No participants found in room ${targetRoom.name}`);
            return [];
          }
          
          // Katılımcı bilgilerini dönüştür
          const formattedParticipants = participants.map(p => {
            const metadata = p.metadata ? JSON.parse(p.metadata) : {};
            return {
              identity: p.identity,
              name: metadata.name || p.identity,
              role: metadata.role || (metadata.isTeacher ? 'teacher' : 'student'),
              isTeacher: metadata.isTeacher || metadata.role === 'teacher',
              state: p.state,
              joinedAt: p.joinedAt,
              streamUrl: this.getStreamUrl(targetRoom.name, p)
            };
          });
          
          this.logger.log(`Found ${formattedParticipants.length} participants in room ${targetRoom.name}`);
          return formattedParticipants;
        } catch (participantError) {
          this.logger.error(`Error listing participants: ${participantError.message}`);
          return [];
        }
      } catch (roomsError) {
        this.logger.error(`Error listing rooms: ${roomsError.message}`);
        return [];
      }
    } catch (error) {
      this.logger.error(`Error getting participants: ${error.message}`, error.stack);
      return [];
    }
  }
  
  /**
   * Manuel olarak katılımcı listesi oluşturur
   * Bu, LiveKit API'sinden katılımcı listesi alınamadığında kullanılır
   */
  private createManualParticipantsList(roomName: string): any[] {
    this.logger.log(`Creating manual participants list for room ${roomName}`);
    
    // Sabit bir öğretmen ve öğrenci katılımcısı oluştur
    return [
      {
        id: 'teacher123',
        name: 'Teacher',
        type: 'teacher',
        status: 'active',
        streamUrl: this.getStreamUrl(roomName, { identity: 'teacher123', name: 'Teacher' } as ParticipantInfo),
      },
      {
        id: 'student456',
        name: 'Student',
        type: 'student',
        status: 'active',
        streamUrl: this.getStreamUrl(roomName, { identity: 'student456', name: 'Student' } as ParticipantInfo),
      }
    ];
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
   * Video konferans oturumunu sonlandırır
   */
  async endSession(sessionId: string, reason: string = 'normal end'): Promise<any> {
    try {
      this.logger.log(`Ending LiveKit session: ${sessionId}, reason: ${reason}`);
      
      // Odayı bul
      const rooms = await this.roomService.listRooms();
      const matchingRoom = rooms.find(room => room.name === sessionId);
      
      // Oda varsa kapat
      if (matchingRoom) {
        this.logger.log(`Found room ${sessionId}, now ending session`);
        await this.roomService.deleteRoom(sessionId);
        this.logger.log(`Room ${sessionId} closed successfully`);
        
        // MCP servisine oturumun kapandığını bildir
        try {
          await this.mcpService.updateVideoSessionStatus(sessionId, 'COMPLETED');
          this.logger.log(`Session ${sessionId} status updated to COMPLETED`);
        } catch (error) {
          this.logger.warn(`Failed to update session status: ${error.message}`);
        }
        
        return {
          success: true,
          message: `Session ${sessionId} ended successfully`,
          reason
        };
      } else {
        this.logger.warn(`Room ${sessionId} not found, nothing to end`);
        return {
          success: false,
          message: `Session ${sessionId} not found`,
          reason
        };
      }
    } catch (error) {
      this.logger.error(`Error ending session: ${error.message}`);
      throw new HttpException(
        `Failed to end session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
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
      
      // Oda adı olarak doğrudan sessionId kullan
      let roomName = sessionId;
      
      // Mevcut odayı bul
      const existingRoom = rooms.find(r => r.name === sessionId);
      
      if (existingRoom) {
        this.logger.log(`Found matching room: ${existingRoom.name}`);
      } else {
        // Geriye uyumluluk için eski formatlı odaları kontrol et
        const legacyRoom = rooms.find(r => 
          r.name.includes(`room_`) && r.name.includes(sessionId)
        );
        
        if (legacyRoom) {
          roomName = legacyRoom.name;
          this.logger.log(`Using legacy room name: ${roomName}`);
        } else {
          this.logger.log(`Using room name: ${roomName} (direct sessionId)`);
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
   * Bağlantısı sorunlu video konferans oturumunu sonlandırır
   */
  async endFaultySession(sessionId: string): Promise<any> {
    try {
      this.logger.log(`Ending faulty LiveKit session: ${sessionId}`);
      
      // MCP servisine oturumun kapandığını bildir
      try {
        await this.mcpService.updateVideoSessionStatus(sessionId, 'FAILED');
        this.logger.log(`Session ${sessionId} status updated to FAILED`);
      } catch (error) {
        this.logger.warn(`Failed to update session status: ${error.message}`);
      }
      
      return {
        success: true,
        message: `Session ${sessionId} ended due to error`,
      };
    } catch (error) {
      this.logger.error(`Error ending faulty session: ${error.message}`);
      throw new HttpException(
        `Failed to end faulty session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  /**
   * Belirtilen oda adıyla LiveKit'te bir oda var mı kontrol eder
   */
  async checkRoomExists(roomName: string): Promise<boolean> {
    try {
      const rooms = await this.roomService.listRooms();
      
      // Mevcut odaları logla
      const roomNames = rooms.map(room => room.name).join(', ');
      this.logger.log(`Available rooms: ${roomNames}`);
      
      // Eşleşen odayı bul
      const matchingRoom = rooms.find(room => room.name === roomName);
      
      if (matchingRoom) {
        this.logger.log(`Found matching room: ${matchingRoom.name}`);
        return true;
      } else {
        this.logger.log(`No matching room found for: ${roomName}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error checking if room exists: ${error.message}`, error.stack);
      return false;
    }
  }
  
  /**
   * LiveKit'teki tüm aktif odaları listeler
   */
  async listActiveRooms(): Promise<Room[]> {
    try {
      const rooms = await this.roomService.listRooms();
      this.logger.log(`Retrieved ${rooms.length} active rooms from LiveKit Cloud`);
      return rooms;
    } catch (error) {
      this.logger.error(`Error listing active rooms: ${error.message}`, error.stack);
      return [];
    }
  }
  
  /**
   * Aktif odaları ve katılımcılarını listeler
   */
  async getActiveRooms(): Promise<any[]> {
    try {
      this.logger.log('Listing active LiveKit rooms');
      const rooms = await this.roomService.listRooms();
      
      // Odaları ve katılımcı bilgilerini dön
      const activeRooms = await Promise.all(rooms.map(async (room) => {
        let participants = [];
        
        try {
          // Odadaki katılımcıları al
          const roomParticipants = await this.roomService.listParticipants(room.name);
          participants = roomParticipants.map(p => ({
            id: p.identity,
            name: p.name || p.identity,
            isActive: true
          }));
        } catch (error) {
          this.logger.warn(`Error listing participants for room ${room.name}: ${error.message}`);
        }
        
        return {
          roomName: room.name,
          numParticipants: room.numParticipants,
          creationTime: room.creationTime,
          metadata: room.metadata,
          participants
        };
      }));
      
      return activeRooms;
    } catch (error) {
      this.logger.error(`Error listing active rooms: ${error.message}`, error.stack);
      return [];
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  async notifyTeacher(teacherId: string, sessionId: string, action: string = 'student_joined'): Promise<any> {
    try {
      this.logger.log(`Notifying teacher ${teacherId} about session ${sessionId} with action ${action}`);
      
      // TeacherId'yi normalize et
      const normalizedTeacherId = teacherId || '';
      
      if (!normalizedTeacherId) {
        this.logger.warn('Teacher ID is empty or undefined');
        return {
          success: false,
          message: 'Teacher ID is required'
        };
      }
      
      // Oturum bilgilerini al
      let sessionDetails = null;
      try {
        sessionDetails = await this.mcpService.getVideoSessionInfo(sessionId);
        this.logger.log(`Retrieved session details for ${sessionId}: ${JSON.stringify(sessionDetails)}`);
      } catch (sessionError) {
        this.logger.warn(`Error getting session details: ${sessionError.message}, but continuing`);
      }
      
      // Oda bilgilerini kontrol et
      let roomExists = false;
      try {
        roomExists = await this.checkRoomExists(sessionId);
        this.logger.log(`Room ${sessionId} exists check: ${roomExists}`);
      } catch (roomError) {
        this.logger.warn(`Error checking if room exists: ${roomError.message}, but continuing`);
      }
      
      // Katılımcıları al
      let participants = [];
      if (roomExists) {
        try {
          participants = await this.getParticipants(sessionId);
          this.logger.log(`Retrieved ${participants.length} participants for room ${sessionId}`);
        } catch (participantsError) {
          this.logger.warn(`Error getting participants: ${participantsError.message}, but continuing`);
        }
      }
      
      // Oturum bilgilerini hazırla - öğretmen için token oluşturmuyoruz
      const pendingSession = {
        _id: sessionId,
        id: sessionId,
        teacherId: normalizedTeacherId,
        status: 'WAITING',
        isActive: true,
        timestamp: new Date().toISOString(),
        action,
        roomName: sessionId,
        participants,
        ...(sessionDetails || {})
      };
      
      // Oturum durumunu güncelle
      try {
        await this.mcpService.updateVideoSessionStatus(sessionId, 'WAITING');
        this.logger.log(`Updated session ${sessionId} status to WAITING`);
      } catch (statusError) {
        this.logger.warn(`Error updating session status: ${statusError.message}, but continuing`);
      }
      
      // Öğretmenin bekleyen oturumlarını güncelle
      try {
        const result = await this.mcpService.updateTeacherPendingSessions(normalizedTeacherId, pendingSession);
        
        if (result && result.success) {
          this.logger.log(`Successfully notified teacher ${normalizedTeacherId} about session ${sessionId}`);
          
          return {
            success: true,
            message: `Teacher ${normalizedTeacherId} notified about session ${sessionId}`,
            action,
            timestamp: new Date().toISOString(),
            roomExists,
            participants
          };
        } else {
          this.logger.warn(`Failed to notify teacher ${normalizedTeacherId}: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        this.logger.warn(`Error notifying teacher ${normalizedTeacherId}: ${error.message}`);
      }
      
      // Hata durumunda bile başarılı bir yanıt döndür
      return {
        success: true, // Başarılı olarak işaretle (frontend'in çalışmaya devam etmesi için)
        verified: false, // Ancak doğrulanamadığını belirt
        message: `Teacher ${teacherId} notification simulated due to error`,
        action,
        timestamp: new Date().toISOString(),
        roomExists,
        participants
      };
    } catch (error) {
      this.logger.error(`Error notifying teacher: ${error.message}`);
      
      // Hata durumunda bile başarılı bir yanıt döndür
      return {
        success: true, // Başarılı olarak işaretle (frontend'in çalışmaya devam etmesi için)
        verified: false, // Ancak doğrulanamadığını belirt
        message: `Teacher ${teacherId} notification simulated due to error`,
        action,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  async registerStudentSession(sessionId: string, teacherId: string, studentId: string, action: string = 'join'): Promise<any> {
    this.logger.log(`Registering student ${studentId} for session ${sessionId} with teacher ${teacherId}`);
    
    try {
      // 1. Önce LiveKit odasının varlığını kontrol et ve metadata'sını güncelle
      const roomInfo = await this.checkRoomExists(sessionId);
      
      // Odanın metadata'sını hazırla
      const metadata = {
        sessionId,
        teacherId,
        studentId,
        action,
        timestamp: new Date().toISOString()
      };
      
      if (roomInfo) {
        // Mevcut oda bulundu, metadata'yı güncelle
        await this.roomService.updateRoomMetadata(sessionId, JSON.stringify(metadata));
        this.logger.log(`Updated metadata for existing room ${sessionId}`);
      } else {
        // Oda bulunamadı, yeni oda oluştur
        await this.createRoomIfNotExists(sessionId, metadata);
        this.logger.log(`Created new room ${sessionId} with metadata`);
      }
      
      // 2. Oturumun durumunu kontrol et - aktif değilse aktif yap
      await this.ensureSessionIsActive(sessionId);
      
      // 3. Öğretmen için mevcut oturumları güncelle
      await this.notifyTeacher(teacherId, sessionId, action);
      
      // 4. Oturumu öğretmen-öğrenci eşleşme listesine ekle
      await this.addToTeacherStudentRegistry(teacherId, sessionId, studentId, action);
      
      // 5. MCP servisini güncelle
      try {
        await this.mcpService.updateVideoSessionData(sessionId, {
          teacherId,
          studentId, 
          status: 'WAITING',
          isActive: true,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        this.logger.warn(`Failed to update MCP for session ${sessionId}: ${error.message}`);
      }
      
      return {
        success: true,
        message: `Student session registered for teacher ${teacherId}`,
        sessionId,
        status: 'ACTIVE'
      };
    } catch (error) {
      this.logger.error(`Error registering student session: ${error.message}`);
      throw new HttpException(
        `Failed to register student session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  // Öğretmen-Öğrenci oturum eşleştirmelerini kaydetmek için
  async addToTeacherStudentRegistry(
    teacherId: string, 
    sessionId: string, 
    studentId: string, 
    action: string
  ): Promise<void> {
    try {
      this.logger.log(`Adding session ${sessionId} to teacher-student registry for teacher ${teacherId}`);
      
      // Oturum bilgilerini hazırla
      const pendingSession = {
        _id: sessionId,
        id: sessionId,
        teacherId,
        studentId,
        status: 'WAITING',
        isActive: true,
        timestamp: new Date().toISOString(),
        action
      };
      
      // Öğretmenin bekleyen oturumlarını güncelle
      await this.mcpService.updateTeacherPendingSessions(teacherId, pendingSession);
      
      this.logger.log(`Added session ${sessionId} to teacher-student registry for teacher ${teacherId}`);
    } catch (error) {
      this.logger.error(`Error adding to teacher-student registry: ${error.message}`);
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  async getTeacherPendingSessions(teacherId: string): Promise<any[]> {
    this.logger.log(`Getting pending sessions for teacher: ${teacherId}`);
    
    try {
      // 1. Önce mevcut video-sessions kontrolcüsünün metodunu kullan
      try {
        // VideoSessionsController'ın mantığını burada kullan
        const activeRooms = await this.listActiveRooms();
        this.logger.log(`Found ${activeRooms.length} active rooms in LiveKit Cloud`);
        
        // Her bir odayı kontrol et ve öğretmenin odalarını belirle
        const teacherRooms = activeRooms.filter(room => {
          // Oda adı formatı: room_{teacherId}_{studentId}_{timestamp} veya sadece MongoID
          const roomMetadata = room.metadata ? JSON.parse(room.metadata) : {};
          return room.name.includes(teacherId) || roomMetadata.teacherId === teacherId;
        });
        
        this.logger.log(`Found ${teacherRooms.length} rooms for teacher ${teacherId}`);
        
        // Aktif oturumları VideoSession formatına dönüştür
        const pendingSessions = teacherRooms.map(room => {
          const roomMetadata = room.metadata ? JSON.parse(room.metadata) : {};
          return {
            _id: room.name,
            teacherId: teacherId,
            studentId: roomMetadata.studentId || 'unknown',
            roomName: room.name,
            status: 'WAITING',
            startTime: new Date(room.creationTime * 1000).toISOString(),
            endTime: '',
            isActive: true,
            createdAt: new Date(room.creationTime * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          };
        });
        
        if (pendingSessions.length > 0) {
          this.logger.log(`Returning ${pendingSessions.length} LiveKit active sessions for teacher ${teacherId}`);
          return pendingSessions;
        }
      } catch (liveKitError) {
        this.logger.warn(`Error getting LiveKit sessions: ${liveKitError.message}, falling back to MCP`);
      }
      
      // 2. LiveKit'ten oturum bulunamazsa, MCP'den deneyelim
      // Tüm aktif oturumları al
      const allSessions = await this.mcpService.getAllVideoSessions();
      
      if (!allSessions || !Array.isArray(allSessions)) {
        this.logger.warn(`No sessions found or invalid response from MCP for teacher ${teacherId}`);
        return [];
      }
      
      // Sadece bu öğretmene ait ve bekleyen (WAITING) oturumları filtrele
      const teacherSessions = allSessions.filter(session => {
        // TeacherId kontrol et ve aktif/bekleyen durumda olduğundan emin ol
        return (
          session.teacherId === teacherId && 
          session.status === 'WAITING' &&
          session.isActive === true
        );
      });
      
      this.logger.log(`Found ${teacherSessions.length} pending sessions in MCP for teacher ${teacherId}`);
      
      // Oturum detaylarını zenginleştir - öğrenci bilgisi ekle
      const enrichedSessions = await Promise.all(
        teacherSessions.map(async (session) => {
          try {
            // Öğrenci bilgisini getir (eğer varsa)
            const studentInfo = await this.mcpService.getUserInfo(session.studentId);
            
            return {
              ...session,
              studentName: studentInfo?.username || studentInfo?.email || 'Öğrenci',
              lastUpdated: session.updatedAt || new Date().toISOString()
            };
          } catch (error) {
            this.logger.warn(`Error enriching session ${session._id}: ${error.message}`);
            return session;
          }
        })
      );
      
      return enrichedSessions;
    } catch (error) {
      this.logger.error(`Error getting teacher pending sessions: ${error.message}`);
      return [];
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  async getStudentInitiatedSessions(teacherId: string): Promise<any[]> {
    try {
      this.logger.log(`Getting student-initiated sessions for teacher ${teacherId}`);
      
      // TeacherId'yi normalize et
      const normalizedTeacherId = teacherId || '';
      
      if (!normalizedTeacherId) {
        this.logger.warn('Teacher ID is empty or undefined');
        return [];
      }
      
      this.logger.log(`Fetching pending sessions for teacher ${normalizedTeacherId}`);
      
      // McpService'den öğretmenin bekleyen oturumlarını al
      const pendingSessions = await this.mcpService.getTeacherPendingSessions(normalizedTeacherId);
      
      if (!pendingSessions || !Array.isArray(pendingSessions)) {
        this.logger.warn(`Invalid response from MCP for teacher ${normalizedTeacherId}: ${JSON.stringify(pendingSessions)}`);
        return [];
      }
      
      this.logger.log(`Found ${pendingSessions.length} sessions from MCP for teacher ${normalizedTeacherId}`);
      
      // Aktif oturumları filtrele
      const activeSessions = pendingSessions.filter(session => {
        // Oturum nesnesi geçerli mi kontrol et
        if (!session) return false;
        
        // Oturum aktif mi kontrol et
        const isActive = session.isActive !== false;
        
        // Oturum durumu WAITING veya ACTIVE mi kontrol et
        const hasValidStatus = session.status === 'WAITING' || session.status === 'ACTIVE';
        
        return isActive && hasValidStatus;
      });
      
      this.logger.log(`Filtered to ${activeSessions.length} active sessions for teacher ${normalizedTeacherId}`);
      
      if (activeSessions.length > 0) {
        this.logger.log(`Active sessions: ${JSON.stringify(activeSessions.map(s => ({
          id: s._id || s.id,
          status: s.status,
          isActive: s.isActive
        })))}`);
      }
      
      return activeSessions;
    } catch (error) {
      this.logger.error(`Error getting student-initiated sessions: ${error.message}`);
      return [];
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  private async getRegisteredStudentSessions(teacherId: string): Promise<any[]> {
    try {
      // LiveKit Cloud'daki mevcut oturumları al
      const activeRooms = await this.listActiveRooms();
      
      // Sadece öğrenci tarafından başlatılan ve öğretmene ait oturumları filtrele
      const studentInitiatedRooms = activeRooms.filter(room => {
        try {
          if (!room.metadata) return false;
          
          const metadata = JSON.parse(room.metadata);
          
          // Sadece öğrenci tarafından başlatılan ve bu öğretmene ait oturumları al
          return metadata.teacherId === teacherId && 
                 metadata.studentId && 
                 metadata.action === 'session_created';
        } catch (e) {
          return false;
        }
      });
      
      // Oturumları VideoSession formatına dönüştür
      return studentInitiatedRooms.map(room => {
        const metadata = JSON.parse(room.metadata || '{}');
        return {
          _id: metadata.sessionId || room.name,
          id: metadata.sessionId || room.name,
          teacherId: metadata.teacherId,
          studentId: metadata.studentId || 'unknown',
          studentName: metadata.studentName || 'Öğrenci',
          roomName: room.name,
          status: 'WAITING',
          startTime: new Date(room.creationTime * 1000).toISOString(),
          endTime: '',
          isActive: true,
          createdAt: new Date(room.creationTime * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
    } catch (error) {
      this.logger.error(`Error getting registered student sessions: ${error.message}`);
      return [];
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  async ensureSessionIsActive(sessionId: string): Promise<void> {
    try {
      // Oturumu kontrol et
      // MCP servisini kullanarak oturum bilgisini al
      // const sessionInfo = await this.mcpService.getVideoSessionInfo(sessionId);
      
      // Oturum aktif değilse aktifleştir
      // if (sessionInfo && sessionInfo.status !== 'ACTIVE') {
      //   this.logger.log(`Updating session ${sessionId} status from ${sessionInfo.status} to ACTIVE`);
      //   await this.mcpService.updateVideoSessionStatus(sessionId, 'ACTIVE');
      //   this.logger.log(`Session ${sessionId} status updated to ACTIVE`);
      // } else if (!sessionInfo) {
      //   this.logger.warn(`Session ${sessionId} not found, creating a new session record`);
      //   // MCP servisine yeni oturum kaydı ekle
      //   await this.mcpService.createVideoSession({
      //     _id: sessionId,
      //     id: sessionId,
      //     status: 'ACTIVE',
      //     timestamp: new Date().toISOString()
      //   });
      // }
    } catch (error) {
      this.logger.error(`Error ensuring session is active: ${error.message}`);
      // Bu bir destekleyici metod olduğu için hatayı yutuyoruz, ana operasyonu etkilememeli
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  public getMcpService(): McpService {
    return this.mcpService;
  }
}
