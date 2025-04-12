import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { RoomServiceClient, Room, ParticipantInfo } from 'livekit-server-sdk';
import { HttpService } from '@nestjs/axios';
import { McpService } from '../mcp/mcp.service';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LiveKitProxyService {
  private readonly logger = new Logger(LiveKitProxyService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly livekitHost: string;
  private readonly livekitMicroserviceUrl: string;
  private readonly videoConferenceApiUrl: string;
  private readonly tokenCache: Map<string, { token: string, expiry: number }> = new Map();
  
  private roomService: RoomServiceClient;
  private httpService: HttpService;
  
  constructor(
    httpService: HttpService,
    private readonly mcpService: McpService,
    private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY', 'APIP2e8PX6AbSkQ');
    this.apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET', 'B4ywBpfTlaHL4T8EW2fU1mvuDxKTIwaXoSHIYeEJpOQB');
    this.livekitHost = this.configService.get<string>('LIVEKIT_URL', 'wss://postply-s2s0711i.livekit.cloud');
    this.livekitMicroserviceUrl = this.configService.get<string>('LIVEKIT_MICROSERVICE_URL', 'http://localhost:3030/api/livekit');
    this.videoConferenceApiUrl = this.configService.get<string>('VIDEO_CONFERENCE_API_URL', 'http://localhost:3000/api');
    
    this.roomService = new RoomServiceClient(this.livekitHost, this.apiKey, this.apiSecret);
    this.httpService = httpService;
    this.logger.log(`LiveKit proxy service initialized with microservice URL: ${this.livekitMicroserviceUrl}`);
    this.logger.log(`Token cache enabled with 1-hour expiry`);
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
      const token = await this.generateToken(roomName, userName, isTeacher);
      
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
      
      if (!roomName) {
        throw new HttpException('Room name is required', HttpStatus.BAD_REQUEST);
      }
      
      const normalizedRoomName = roomName.trim();
      
      // Odanın var olup olmadığını kontrol et
      let roomExists = false;
      try {
        const rooms = await this.listActiveRooms();
        roomExists = rooms.some(room => room.name === normalizedRoomName);
        this.logger.log(`Room exists check: ${roomExists ? 'Yes' : 'No'}`);
      } catch (checkError) {
        this.logger.error(`Error checking if room exists: ${checkError.message}`);
        // Hata durumunda odayı oluşturmaya çalış
      }
      
      // Oda yoksa oluştur
      if (!roomExists) {
        this.logger.log(`Room ${normalizedRoomName} does not exist, creating...`);
        
        try {
          // LiveKit mikroservisini kullanarak odayı oluştur
          const response = await firstValueFrom(
            this.httpService.post(`${this.livekitMicroserviceUrl}/room`, {
              roomName: normalizedRoomName,
              metadata: metadata ? JSON.stringify(metadata) : undefined
            })
          );
          
          if (response.status === 200) {
            this.logger.log(`Room ${normalizedRoomName} created successfully via microservice`);
            return response.data;
          } else {
            throw new Error(`Failed to create room: ${response.statusText}`);
          }
        } catch (error) {
          this.logger.error(`Error creating room via microservice: ${error.message}`);
          throw new HttpException(`Failed to create room: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      } else {
        this.logger.log(`Room ${normalizedRoomName} already exists`);
        return { name: normalizedRoomName, exists: true };
      }
    } catch (error) {
      this.logger.error(`Error in createRoomIfNotExists: ${error.message}`);
      throw new HttpException(`Failed to create room: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  /**
   * LiveKit token oluşturur
   */
  private async generateToken(roomName: string, userName: string, isTeacher: boolean): Promise<string> {
    try {
      this.logger.log(`Generating token for ${userName} in room ${roomName}, isTeacher: ${isTeacher}`);
      
      if (!roomName) {
        throw new HttpException('Room name is required', HttpStatus.BAD_REQUEST);
      }
      
      if (!userName) {
        throw new HttpException('User name is required', HttpStatus.BAD_REQUEST);
      }
      
      // Önce cache'de token var mı kontrol et
      const cacheKey = `${roomName}:${userName}:${isTeacher}`;
      const cachedToken = this.tokenCache.get(cacheKey);
      const now = Date.now();
      
      if (cachedToken && cachedToken.expiry > now) {
        this.logger.log(`Using cached token for ${userName} in room ${roomName}, expires in ${Math.round((cachedToken.expiry - now) / 1000)} seconds`);
        return cachedToken.token;
      }
      
      // LiveKit mikroservisini kullanarak token oluştur
      try {
        const response = await firstValueFrom(
          this.httpService.post(`${this.livekitMicroserviceUrl}/token`, {
            roomName,
            identity: userName,
            isTeacher
          })
        );
        
        if (response.status === 200 && response.data.token) {
          const token = response.data.token;
          
          // Token'ı cache'e ekle (1 saat geçerli)
          const expiryTime = now + (60 * 60 * 1000); // 1 saat
          this.tokenCache.set(cacheKey, { token, expiry: expiryTime });
          
          this.logger.log(`Token generated successfully for ${userName} in room ${roomName}`);
          return token;
        } else {
          throw new Error('Invalid token response from microservice');
        }
      } catch (error) {
        this.logger.error(`Error generating token via microservice: ${error.message}`);
        throw new HttpException(
          `LiveKit mikroservisi ile token oluşturulamadı. Lütfen LiveKit servisinin çalıştığından emin olun. Hata: ${error.message}`, 
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    } catch (error) {
      this.logger.error(`Error in generateToken: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to generate token: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  /**
   * Odadaki katılımcıları döndürür
   */
  async getParticipants(roomName: string): Promise<any[]> {
    try {
      // Oda adını normalize et
      const normalizedRoomName = roomName.trim();
      this.logger.log(`Getting participants for room ${normalizedRoomName}`);
      
      if (!normalizedRoomName) {
        throw new HttpException('Room name is required', HttpStatus.BAD_REQUEST);
      }
      
      // Mikroservis üzerinden katılımcıları al
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${this.livekitMicroserviceUrl}/participants/${normalizedRoomName}`)
        );
        
        if (response.status === 200) {
          const participants = response.data.participants || [];
          this.logger.log(`Retrieved ${participants.length} participants from microservice for room ${normalizedRoomName}`);
          
          if (participants.length === 0) {
            this.logger.warn(`No participants found in room ${normalizedRoomName}`);
          }
          
          return participants;
        } else {
          throw new Error(`Microservice returned status ${response.status}`);
        }
      } catch (microserviceError) {
        this.logger.error(`Error getting participants from microservice: ${microserviceError.message}`);
        throw new HttpException(
          `LiveKit mikroservisi ile katılımcılar alınamadı. Lütfen LiveKit servisinin çalıştığından emin olun. Hata: ${microserviceError.message}`,
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    } catch (error) {
      this.logger.error(`Error getting participants: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to get participants: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
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
   * Video konferans oturumunu sonlandırır
   */
  async endSession(sessionId: string, reason: string = 'normal end'): Promise<any> {
    try {
      this.logger.log(`Ending LiveKit session: ${sessionId}, reason: ${reason}`);
      
      if (!sessionId) {
        throw new HttpException('Session ID is required', HttpStatus.BAD_REQUEST);
      }
      
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
        } catch (mcpError) {
          this.logger.error(`Error updating session status in MCP: ${mcpError.message}`);
          throw new HttpException(
            `Failed to update session status in MCP: ${mcpError.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
        
        return {
          success: true,
          message: `Session ${sessionId} ended successfully`,
          timestamp: new Date().toISOString()
        };
      } else {
        this.logger.warn(`Room ${sessionId} not found, might be already closed`);
        throw new HttpException(`Room ${sessionId} not found, might be already closed`, HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      this.logger.error(`Error ending session: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
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
      this.logger.log('Listing active LiveKit rooms via microservice');
      
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${this.livekitMicroserviceUrl}/rooms`)
        );
        
        if (response.status === 200) {
          const rooms = response.data.rooms || [];
          this.logger.log(`Retrieved ${rooms.length} active rooms from microservice`);
          return rooms;
        } else {
          throw new Error(`Microservice returned status ${response.status}`);
        }
      } catch (microserviceError) {
        this.logger.error(`Error listing active rooms from microservice: ${microserviceError.message}`);
        throw new HttpException(
          `LiveKit mikroservisi ile aktif odalar alınamadı. Lütfen LiveKit servisinin çalıştığından emin olun. Hata: ${microserviceError.message}`,
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    } catch (error) {
      this.logger.error(`Error listing active rooms: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to list active rooms: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  /**
   * Aktif odaları ve katılımcılarını listeler
   */
  async getActiveRooms(): Promise<any[]> {
    try {
      this.logger.log('Getting active rooms with participants via microservice');
      
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${this.livekitMicroserviceUrl}/active-rooms`)
        );
        
        if (response.status === 200) {
          const activeRooms = response.data.rooms || [];
          this.logger.log(`Retrieved ${activeRooms.length} active rooms with participants from microservice`);
          return activeRooms;
        } else {
          throw new Error(`Microservice returned status ${response.status}`);
        }
      } catch (microserviceError) {
        this.logger.error(`Error getting active rooms from microservice: ${microserviceError.message}`);
        throw new HttpException(
          `LiveKit mikroservisi ile aktif odalar ve katılımcılar alınamadı. Lütfen LiveKit servisinin çalıştığından emin olun. Hata: ${microserviceError.message}`,
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    } catch (error) {
      this.logger.error(`Error getting active rooms: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to get active rooms: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
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
        throw new HttpException('Teacher ID is required', HttpStatus.BAD_REQUEST);
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
          throw new HttpException(
            `Failed to notify teacher ${normalizedTeacherId}`,
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      } catch (error) {
        this.logger.error(`Error notifying teacher ${normalizedTeacherId}: ${error.message}`);
        throw new HttpException(
          `Error notifying teacher ${normalizedTeacherId}: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    } catch (error) {
      this.logger.error(`Error notifying teacher: ${error.message}`);
      throw error;
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
        this.logger.error(`Failed to update MCP for session ${sessionId}: ${error.message}`);
        throw new HttpException(
          `Failed to update MCP for session ${sessionId}: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
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
      if (!teacherId) {
        throw new HttpException('Teacher ID is required', HttpStatus.BAD_REQUEST);
      }
      
      const normalizedTeacherId = teacherId.trim();
      
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
        this.logger.error(`Error getting LiveKit sessions: ${liveKitError.message}`);
        throw new HttpException(`Failed to get LiveKit sessions: ${liveKitError.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      // 2. LiveKit'ten oturum bulunamazsa, MCP'den deneyelim
      // Tüm aktif oturumları al
      const pendingSessions = await this.mcpService.getTeacherPendingSessions(normalizedTeacherId);
      
      if (!pendingSessions || !Array.isArray(pendingSessions)) {
        throw new HttpException(`No pending sessions found for teacher ${teacherId}`, HttpStatus.NOT_FOUND);
      }
      
      this.logger.log(`Found ${pendingSessions.length} pending sessions in MCP for teacher ${teacherId}`);
      
      // Oturum detaylarını zenginleştir - öğrenci bilgisi ekle
      const enrichedSessions = await Promise.all(
        pendingSessions.map(async (session) => {
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
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get teacher pending sessions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  async getStudentInitiatedSessions(teacherId: string): Promise<any[]> {
    try {
      this.logger.log(`Getting student-initiated sessions for teacher ${teacherId}`);
      
      const normalizedTeacherId = teacherId || '';
      
      if (!normalizedTeacherId) {
        this.logger.warn('Teacher ID is empty or undefined');
        throw new HttpException('Teacher ID is required', HttpStatus.BAD_REQUEST);
      }
      
      this.logger.log(`Fetching pending sessions for teacher ${normalizedTeacherId}`);
      
      // McpService'den öğretmenin bekleyen oturumlarını al
      const pendingSessions = await this.mcpService.getTeacherPendingSessions(normalizedTeacherId);
      
      if (!pendingSessions || !Array.isArray(pendingSessions)) {
        this.logger.error(`Invalid response from MCP for teacher ${normalizedTeacherId}: ${JSON.stringify(pendingSessions)}`);
        throw new HttpException(
          `Failed to get valid sessions from MCP for teacher ${normalizedTeacherId}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
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
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get student-initiated sessions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  private async getRegisteredStudentSessions(teacherId: string): Promise<any[]> {
    try {
      if (!teacherId) {
        this.logger.error('Teacher ID is empty or undefined');
        throw new HttpException('Teacher ID is required', HttpStatus.BAD_REQUEST);
      }
      
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
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get registered student sessions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  async ensureSessionIsActive(sessionId: string): Promise<void> {
    try {
      if (!sessionId) {
        this.logger.error('Session ID is empty or undefined');
        throw new HttpException('Session ID is required', HttpStatus.BAD_REQUEST);
      }
      
      // Oturumu kontrol et
      // MCP servisini kullanarak oturum bilgisini al
      const sessionInfo = await this.mcpService.getVideoSessionInfo(sessionId);
      
      // Oturum aktif değilse aktifleştir
      if (sessionInfo && sessionInfo.status !== 'ACTIVE') {
        this.logger.log(`Updating session ${sessionId} status from ${sessionInfo.status} to ACTIVE`);
        await this.mcpService.updateVideoSessionStatus(sessionId, 'ACTIVE');
        this.logger.log(`Session ${sessionId} status updated to ACTIVE`);
      } else if (!sessionInfo) {
        this.logger.warn(`Session ${sessionId} not found, creating a new session record`);
        // MCP servisine yeni oturum kaydı ekle
        await this.mcpService.createVideoSession({
          _id: sessionId,
          id: sessionId,
          status: 'ACTIVE',
          timestamp: new Date().toISOString()
        });
        this.logger.log(`New session record created for ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring session is active: ${error.message}`);
      throw new HttpException(
        `Failed to ensure session is active: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  // Öğretmene bildirim gönderme metodu - LiveKit Controller tarafından çağrılır
  public getMcpService(): McpService {
    return this.mcpService;
  }
}
