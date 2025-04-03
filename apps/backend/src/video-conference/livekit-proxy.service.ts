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
   * Oda oluştur (yoksa)
   */
  async createRoomIfNotExists(roomName: string, metadata?: any): Promise<any> {
    try {
      this.logger.log(`Checking if room exists: ${roomName}`);
      
      // Odayı bulmayı dene
      let found = false;
      try {
        const rooms = await this.roomService.listRooms();
        found = rooms.some(room => room.name === roomName);
      } catch (listError) {
        this.logger.warn(`Error listing rooms: ${listError.message}`);
      }
      
      // Oda yoksa oluştur
      if (!found) {
        this.logger.log(`Room ${roomName} does not exist, creating new room`);
        
        // Metadata'yı oluştur
        const roomMetadata = metadata ? JSON.stringify(metadata) : JSON.stringify({
          createdAt: new Date().toISOString()
        });
        
        // Odayı oluştur
        await this.roomService.createRoom({
          name: roomName,
          emptyTimeout: 10 * 60, // 10 dakika
          maxParticipants: 2,    // Öğretmen ve öğrenci
          metadata: roomMetadata
        });
        
        this.logger.log(`Room ${roomName} created successfully with metadata: ${roomMetadata}`);
        
        // MCP'deki oturum verisini de güncelle
        if (metadata && metadata.sessionId) {
          try {
            await this.mcpService.updateVideoSessionData(metadata.sessionId, {
              roomName,
              ...metadata,
              updatedAt: new Date().toISOString()
            });
            this.logger.log(`Updated MCP session data for ${metadata.sessionId}`);
          } catch (mcpError) {
            this.logger.warn(`Error updating MCP session: ${mcpError.message}`);
          }
        }
        
        return { created: true, name: roomName, metadata: roomMetadata };
      }
      
      // Oda mevcutsa, metadata'yı güncelle
      if (metadata) {
        try {
          const roomMetadata = JSON.stringify(metadata);
          await this.roomService.updateRoomMetadata(roomName, roomMetadata);
          this.logger.log(`Updated metadata for existing room ${roomName}`);
          
          // MCP'deki oturum verisini de güncelle
          if (metadata.sessionId) {
            try {
              await this.mcpService.updateVideoSessionData(metadata.sessionId, {
                roomName,
                ...metadata,
                updatedAt: new Date().toISOString()
              });
              this.logger.log(`Updated MCP session data for ${metadata.sessionId}`);
            } catch (mcpError) {
              this.logger.warn(`Error updating MCP session: ${mcpError.message}`);
            }
          }
        } catch (updateError) {
          this.logger.warn(`Error updating room metadata: ${updateError.message}`);
        }
      }
      
      this.logger.log(`Room ${roomName} already exists`);
      return { created: false, name: roomName };
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
    this.logger.log(`Notifying teacher ${teacherId} about session ${sessionId} with action ${action}`);
    
    try {
      // 1. Oturumun durumunu kontrol et - aktif değilse aktif yap
      await this.ensureSessionIsActive(sessionId);
      
      // 2. Öğretmen için mevcut oturumları güncelle
      const pendingSession = {
        _id: sessionId,
        id: sessionId,
        teacherId,
        status: 'WAITING',
        timestamp: new Date().toISOString(),
        action
      };
      
      // 3. MCP servisini kullanarak, öğretmen ID'si altında oturumu kaydet
      try {
        await this.mcpService.updateTeacherPendingSessions(teacherId, pendingSession);
        this.logger.log(`Teacher ${teacherId} pending sessions updated with session ${sessionId}`);
      } catch (error) {
        this.logger.error(`Failed to update teacher pending sessions: ${error.message}`);
      }
      
      // 4. LiveKit odasının varlığını doğrula
      const exists = await this.checkRoomExists(sessionId);
      if (!exists) {
        await this.createRoomIfNotExists(sessionId);
        this.logger.log(`Created room ${sessionId} for upcoming session`);
      }
      
      return {
        success: true,
        message: `Teacher ${teacherId} notified about session ${sessionId}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error notifying teacher: ${error.message}`);
      throw new HttpException(
        `Failed to notify teacher: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  // Öğrenci oturumunu kaydetme metodu - LiveKit Controller tarafından çağrılır
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
  private async addToTeacherStudentRegistry(
    teacherId: string, 
    sessionId: string, 
    studentId: string, 
    action: string
  ): Promise<void> {
    try {
      // MCP servisini kullanarak oturum bilgisini al
      const sessionInfo = await this.mcpService.getVideoSessionInfo(sessionId);
      
      if (!sessionInfo) {
        this.logger.warn(`Session ${sessionId} not found, cannot add to registry`);
        return;
      }
      
      // Öğretmen-Öğrenci kayıtlarını saklamak için basit bir CRUD işlemi yap
      // Bu örnekte, sadece gerçek öğrenci isteklerini döndüreceğiz
      // Simüle edilmiş veya test oturumları oluşturmuyoruz
      
      // MCP servisindeki oturum bilgisini güncelle
      await this.mcpService.updateVideoSessionData(sessionId, {
        teacherId,
        studentId,
        lastAction: action,
        updatedAt: new Date().toISOString(),
        status: 'WAITING', // Öğretmen henüz katılmadı
      });
      
      this.logger.log(`Added session ${sessionId} to teacher-student registry for teacher ${teacherId}`);
    } catch (error) {
      this.logger.error(`Error adding to teacher-student registry: ${error.message}`);
      // Hatayı yukarıya fırlatma, işlem devam etsin
    }
  }
  
  // Öğretmen için bekleyen oturumları getir
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
            updatedAt: new Date().toISOString(),
            studentName: roomMetadata.studentName || 'Anonim Öğrenci',
            teacherName: roomMetadata.teacherName || 'Öğretmen'
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
              studentName: studentInfo?.username || studentInfo?.email || 'Anonim Öğrenci',
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
  
  /**
   * Sadece öğrenciler tarafından başlatılan gerçek video konferans isteklerini getirir
   * @param teacherId Öğretmen ID'si
   */
  async getStudentInitiatedSessions(teacherId: string): Promise<any[]> {
    try {
      this.logger.log(`Getting student-initiated sessions for teacher ${teacherId}`);
      
      // Birden fazla kaynaktan öğrenci tarafından başlatılan oturumları al
      let allSessions: any[] = [];
      
      // 1. MCP servisinden öğretmenin bekleyen oturumlarını al
      try {
        const mcpSessions = await this.mcpService.getTeacherPendingSessions(teacherId);
        if (mcpSessions && Array.isArray(mcpSessions) && mcpSessions.length > 0) {
          this.logger.log(`Found ${mcpSessions.length} real student-initiated sessions from MCP for teacher ${teacherId}`);
          allSessions = [...allSessions, ...mcpSessions];
        }
      } catch (mcpError) {
        this.logger.warn(`Could not get sessions from MCP: ${mcpError.message}`);
      }
      
      // 2. LiveKit Cloud'dan kayıtlı öğrenci oturumlarını al
      try {
        const studentSessions = await this.getRegisteredStudentSessions(teacherId);
        if (studentSessions && studentSessions.length > 0) {
          this.logger.log(`Found ${studentSessions.length} registered student sessions from LiveKit for teacher ${teacherId}`);
          
          // MCP'den gelen oturumlarla birleştir, ancak duplikasyonları önle
          const existingSessionIds = new Set(allSessions.map(session => session._id || session.id));
          const newSessions = studentSessions.filter(session => 
            !existingSessionIds.has(session._id) && !existingSessionIds.has(session.id)
          );
          
          if (newSessions.length > 0) {
            this.logger.log(`Adding ${newSessions.length} unique LiveKit sessions to results`);
            allSessions = [...allSessions, ...newSessions];
          }
        }
      } catch (lkError) {
        this.logger.warn(`Error getting LiveKit sessions: ${lkError.message}`);
      }
      
      // 3. Oturum durumlarını kontrol et ve sadece aktif/bekleyen oturumları döndür
      const validSessions = allSessions.filter(session => {
        // Null/undefined kontrolü
        if (!session) return false;
        
        // Durum kontrolü - sadece WAITING veya ACTIVE durumundaki oturumları al
        const status = (session.status || '').toLowerCase();
        const isValidStatus = status === 'waiting' || status === 'active';
        
        // Aktiflik kontrolü
        const isActive = session.isActive === true;
        
        return isValidStatus && isActive;
      });
      
      this.logger.log(`Returning ${validSessions.length} valid student-initiated sessions for teacher ${teacherId}`);
      return validSessions;
    } catch (error) {
      this.logger.error(`Error getting student-initiated sessions: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Kayıtlı öğrenci oturumlarını getirir
   * @param teacherId Öğretmen ID'si
   */
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
  
  // Oturumun aktif olduğundan emin ol
  async ensureSessionIsActive(sessionId: string): Promise<void> {
    try {
      // Oturumu kontrol et
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
      }
    } catch (error) {
      this.logger.error(`Error ensuring session is active: ${error.message}`);
      // Bu bir destekleyici metod olduğu için hatayı yutuyoruz, ana operasyonu etkilememeli
    }
  }
  
  // Debug için MCP servisine erişim sağlar
  public getMcpService(): McpService {
    return this.mcpService;
  }
}
