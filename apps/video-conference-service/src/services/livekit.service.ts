import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

// Log seviyesi
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

@Injectable()
export class LiveKitService {
  private livekitServiceUrl: string;
  private logLevel: LogLevel = LogLevel.INFO; // Varsayılan log seviyesi
  private tokenCache: Map<string, { token: string, expiry: number }> = new Map(); // Token önbelleği

  constructor(
    private configService: ConfigService,
    private httpService: HttpService
  ) {
    // LiveKit mikroservisinin URL'si
    this.livekitServiceUrl = this.configService.get<string>('LIVEKIT_SERVICE_URL') || 'http://localhost:3030/api/livekit';
    
    // Log seviyesini ayarla
    const configLogLevel = this.configService.get<string>('LOG_LEVEL') || 'INFO';
    switch (configLogLevel.toUpperCase()) {
      case 'DEBUG': this.logLevel = LogLevel.DEBUG; break;
      case 'INFO': this.logLevel = LogLevel.INFO; break;
      case 'WARN': this.logLevel = LogLevel.WARN; break;
      case 'ERROR': this.logLevel = LogLevel.ERROR; break;
    }
    
    this.logInfo(`LiveKit service initialized with microservice URL: ${this.livekitServiceUrl}`);
    this.logInfo(`Token cache enabled with 1-hour expiry`);
  }

  // Log yardımcı fonksiyonları
  private logDebug(message: string): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] [LiveKitService] ${message}`);
    }
  }

  private logInfo(message: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(`[INFO] [LiveKitService] ${message}`);
    }
  }

  private logWarn(message: string): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`[WARN] [LiveKitService] ${message}`);
    }
  }

  private logError(message: string, error?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] [LiveKitService] ${message}`);
      if (error) {
        console.error(error);
      }
    }
  }

  /**
   * Yeni bir oda oluşturur
   */
  async createRoom(roomName: string = null): Promise<any> {
    // Oda adı belirtilmemişse otomatik oluştur
    if (!roomName) {
      roomName = `room_${uuidv4()}`;
    }
    
    try {
      this.logDebug(`Creating room: ${roomName}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.livekitServiceUrl}/room`, { roomName })
      );
      
      if (response.data && response.data.success) {
        this.logInfo(`Room ${roomName} created successfully via microservice`);
        return response.data.room;
      } else {
        throw new Error('Failed to create room via microservice');
      }
    } catch (error) {
      this.logError('Error creating LiveKit room via microservice:', error);
      throw new Error(`Failed to create LiveKit room: ${error.message}`);
    }
  }

  /**
   * Öğretmen için token oluşturur
   */
  generateTeacherToken(roomName: string, participantName: string, participantId: string): Promise<any> {
    return this.generateToken(roomName, participantName, participantId, true);
  }

  /**
   * Öğrenci için token oluşturur
   */
  generateStudentToken(roomName: string, participantName: string, participantId: string): Promise<any> {
    return this.generateToken(roomName, participantName, participantId, false);
  }

  /**
   * Belirli bir oda için token oluşturur
   */
  async generateToken(roomName: string, participantName: string, participantId: string, isTeacher: boolean): Promise<any> {
    try {
      // Önbellekte token var mı kontrol et
      const cacheKey = `${roomName}:${participantId}:${isTeacher ? 'teacher' : 'student'}`;
      const cachedToken = this.tokenCache.get(cacheKey);
      
      // Önbellekte token varsa ve süresi dolmamışsa kullan
      if (cachedToken && cachedToken.expiry > Date.now()) {
        this.logDebug(`Using cached token for ${participantName} in room ${roomName} (expires in ${Math.floor((cachedToken.expiry - Date.now()) / 1000)} seconds)`);
        return {
          token: cachedToken.token,
          wsUrl: this.configService.get<string>('LIVEKIT_WS_URL')
        };
      }
      
      this.logDebug(`Generating ${isTeacher ? 'teacher' : 'student'} token for room: ${roomName}, participant: ${participantName}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.livekitServiceUrl}/token`, {
          roomName,
          participantName: participantName || participantId, // Eğer isim yoksa ID'yi kullan
          isTeacher
        })
      );
      
      if (response.data && response.data.success) {
        const token = response.data.token;
        this.logInfo(`Token generated successfully for ${participantName}`);
        
        // Token'ı önbelleğe al (1 saat geçerli)
        const expiryTime = Date.now() + (60 * 60 * 1000); // 1 saat
        this.tokenCache.set(cacheKey, { 
          token,
          expiry: expiryTime
        });
        
        this.logDebug(`Token cached with key ${cacheKey}, expires at ${new Date(expiryTime).toISOString()}`);
        
        // Token ve WebSocket URL'sini döndür
        return {
          token,
          wsUrl: this.configService.get<string>('LIVEKIT_WS_URL')
        };
      } else {
        throw new Error('Failed to generate token via microservice');
      }
    } catch (error) {
      this.logError(`Error generating ${isTeacher ? 'teacher' : 'student'} token via microservice:`, error);
      throw new Error(`Failed to generate token: ${error.message}`);
    }
  }

  /**
   * Belirli bir odayı sonlandırır
   */
  async endRoom(roomName: string): Promise<void> {
    try {
      await this.deleteRoom(roomName);
    } catch (error) {
      this.logError('Error ending LiveKit room:', error);
      throw new Error(`Failed to end LiveKit room: ${error.message}`);
    }
  }

  /**
   * Belirli bir odayı siler
   */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      this.logDebug(`Deleting LiveKit room: ${roomName}`);
      
      const response = await firstValueFrom(
        this.httpService.delete(`${this.livekitServiceUrl}/room/${roomName}`)
      );
      
      if (response.data && response.data.success) {
        this.logInfo(`LiveKit room ${roomName} deleted successfully via microservice`);
      } else {
        throw new Error('Failed to delete room via microservice');
      }
    } catch (error) {
      this.logError(`Error deleting LiveKit room via microservice:`, error);
      throw new Error(`Failed to delete LiveKit room: ${error.message}`);
    }
  }
  
  /**
   * Bir odadaki katılımcıları listeler
   */
  async getParticipants(roomName: string, refresh: boolean = false): Promise<any[]> {
    try {
      this.logDebug(`Fetching participants for room: ${roomName}, refresh: ${refresh}`);
      
      // Katılımcı listesini LiveKit mikroservisinden al
      const url = refresh 
        ? `${this.livekitServiceUrl}/participants/${roomName}?refresh=true`
        : `${this.livekitServiceUrl}/participants/${roomName}`;
      
      const response = await firstValueFrom(
        this.httpService.get(url)
      );
      
      if (response.data && response.data.success) {
        const participants = response.data.participants || [];
        this.logInfo(`Found ${participants.length} participants in room ${roomName}`);
        
        // Katılımcı sayısı 0 ise ve refresh parametresi false ise, refresh ile tekrar dene
        if (participants.length === 0 && !refresh) {
          this.logWarn(`No participants found in room ${roomName}, retrying with refresh=true`);
          return this.getParticipants(roomName, true);
        }
        
        // Debug log
        if (this.logLevel === LogLevel.DEBUG && participants.length > 0) {
          participants.forEach((p, i) => {
            this.logDebug(`Participant ${i+1}: ${p.identity}, State: ${p.state}, Metadata: ${p.metadata || 'None'}`);
          });
        }
        
        return participants;
      } else {
        this.logWarn(`Failed to get participants: ${response.data?.message || 'Unknown error'}`);
        
        // Eğer refresh parametresi false ise, refresh ile tekrar dene
        if (!refresh) {
          this.logInfo(`Retrying with refresh=true`);
          return this.getParticipants(roomName, true);
        }
        
        return [];
      }
    } catch (error) {
      this.logError(`Error getting participants for room ${roomName}:`, error);
      
      // Eğer refresh parametresi false ise, refresh ile tekrar dene
      if (!refresh) {
        this.logInfo(`Retrying with refresh=true after error`);
        // Kısa bir bekleme ekleyelim
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.getParticipants(roomName, true);
      }
      
      return [];
    }
  }
  
  /**
   * Odanın varlığını kontrol eder
   */
  async roomExists(roomName: string): Promise<boolean> {
    try {
      this.logDebug(`Checking if room exists: ${roomName}`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.livekitServiceUrl}/room/${roomName}/exists`)
      );
      
      if (response.data && response.data.success) {
        const exists = response.data.exists;
        this.logDebug(`Room ${roomName} exists: ${exists}`);
        return exists;
      }
      
      return false;
    } catch (error) {
      this.logError(`Error checking room existence via microservice:`, error);
      return false;
    }
  }
}
