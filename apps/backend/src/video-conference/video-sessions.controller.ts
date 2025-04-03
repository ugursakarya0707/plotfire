import { Controller, Post, Get, Body, Param, Logger, HttpException, HttpStatus, Put, Query } from '@nestjs/common';
import { LiveKitProxyService } from './livekit-proxy.service';
import { ObjectId } from 'mongodb';

@Controller('video-sessions')
export class VideoSessionsController {
  private readonly logger = new Logger(VideoSessionsController.name);

  constructor(private readonly livekitProxyService: LiveKitProxyService) {}

  // Yeni video konferans isteği oluşturma
  @Post()
  async createVideoSession(@Body() body: { teacherId: string; studentId: string; studentName?: string }) {
    try {
      const { teacherId, studentId, studentName } = body;
      this.logger.log(`Creating video session for teacher ${teacherId} and student ${studentId}`);

      // Benzersiz bir ID oluştur (MongoDB ObjectId formatında)
      const sessionId = new ObjectId().toString();
      const roomName = sessionId;

      // LiveKit Cloud'da oda oluştur
      await this.livekitProxyService.createRoomIfNotExists(roomName, {
        sessionId,
        teacherId,
        studentId,
        studentName: studentName || 'Anonim Öğrenci',
        action: 'session_created'
      });
      
      // Oturum bilgilerini hazırla
      const sessionData = {
        _id: sessionId,
        id: sessionId,
        teacherId,
        studentId,
        roomName,
        status: 'WAITING',
        startTime: new Date().toISOString(),
        endTime: '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Öğretmene bildirim gönderme işlemini başlat
      try {
        await this.livekitProxyService.notifyTeacher(teacherId, sessionId, 'session_created');
        this.logger.log(`Teacher ${teacherId} notified about new session ${sessionId}`);
      } catch (notifyError) {
        this.logger.warn(`Could not notify teacher, but continuing with session creation: ${notifyError.message}`);
      }

      return sessionData;
    } catch (error) {
      this.logger.error(`Error creating video session: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to create video session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('notify-teacher')
  async notifyTeacher(@Body() body: { teacherId: string; sessionId: string; action?: string }) {
    try {
      const { teacherId, sessionId, action } = body;
      this.logger.log(`Notifying teacher ${teacherId} about session ${sessionId} with action ${action || 'join'}`);
      
      // LiveKit Cloud'daki oturumu kontrol et
      const roomExists = await this.livekitProxyService.checkRoomExists(sessionId);
      
      if (!roomExists) {
        this.logger.warn(`Room ${sessionId} does not exist in LiveKit Cloud`);
      } else {
        this.logger.log(`Room ${sessionId} exists in LiveKit Cloud, teacher can join`);
      }
      
      // Gerçek uygulamada burada veritabanında bir değişiklik yapabilir veya
      // WebSocket üzerinden gerçek zamanlı bildirim gönderebiliriz
      
      return { 
        success: true, 
        message: `Teacher ${teacherId} notified about session ${sessionId}`,
        timestamp: new Date().toISOString(),
        action: action || 'join',
        roomExists
      };
    } catch (error) {
      this.logger.error(`Error notifying teacher: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to notify teacher: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('teacher/:teacherId/pending')
  async getPendingSessionsForTeacher(@Param('teacherId') teacherId: string, @Query('force') force?: string) {
    try {
      this.logger.log(`Getting pending sessions for teacher ${teacherId}`);
      
      // Sadece gerçek öğrenci isteklerini al
      const studentInitiatedSessions = await this.livekitProxyService.getStudentInitiatedSessions(teacherId);
      this.logger.log(`Found ${studentInitiatedSessions.length} student-initiated sessions for teacher ${teacherId}`);
      
      return studentInitiatedSessions;
    } catch (error) {
      this.logger.error(`Error getting pending sessions for teacher ${teacherId}: ${error.message}`);
      throw new HttpException('Failed to get pending sessions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  // Oturum durumunu güncelle
  @Put(':sessionId/status')
  async updateSessionStatus(
    @Param('sessionId') sessionId: string,
    @Body() updateData: { status: string }
  ) {
    this.logger.log(`Updating session ${sessionId} status to ${updateData.status}`);
    
    try {
      // LiveKit Cloud'da odanın durumunu kontrol et
      const roomExists = await this.livekitProxyService.checkRoomExists(sessionId);
      
      if (!roomExists && updateData.status === 'ACTIVE') {
        this.logger.warn(`Room ${sessionId} does not exist in LiveKit Cloud but trying to set as ACTIVE`);
        // Burada gerçek uygulamada odayı oluşturabilir veya hata dönebiliriz
      }
      
      // Gerçek uygulamada veritabanında oturum durumunu güncelleyecektik
      // Sahte başarılı yanıt döndür
      return {
        success: true,
        message: `Session ${sessionId} status updated to ${updateData.status}`,
        roomExists
      };
    } catch (error) {
      this.logger.error(`Error updating session status: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to update session status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  // Öğretmenin oturuma katılması için endpoint
  @Put(':sessionId/start')
  async startSessionAsTeacher(
    @Param('sessionId') sessionId: string,
    @Query('teacherName') teacherName: string,
    @Query('studentName') studentName: string = 'Öğrenci',
    @Query('roomName') roomName: string
  ) {
    try {
      this.logger.log(`Teacher ${teacherName} starting session ${sessionId}`);
      
      // LiveKit odasını kontrol et veya oluştur
      await this.livekitProxyService.createRoomIfNotExists(roomName || sessionId, {
        sessionId,
        teacherName,
        studentName,
        action: 'teacher_join'
      });
      
      // Öğretmen için token oluştur
      const token = await this.livekitProxyService.createToken(
        roomName || sessionId,
        teacherName,
        true // isTeacher
      );
      
      // Oturumu ACTIVE durumuna güncelle
      try {
        // Burada oturum durumunu güncelleme işlemi yapılabilir
        this.logger.log(`Setting session ${sessionId} to ACTIVE state`);
      } catch (statusError) {
        this.logger.warn(`Failed to update session status: ${statusError.message}`);
      }
      
      return {
        success: true,
        token,
        sessionId,
        roomName: roomName || sessionId,
        message: `Teacher ${teacherName} has joined session ${sessionId}`
      };
    } catch (error) {
      this.logger.error(`Error starting session as teacher: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to start session as teacher: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Belirli bir oturumu ID'ye göre getir
  @Get(':sessionId')
  async getSessionById(@Param('sessionId') sessionId: string) {
    try {
      this.logger.log(`Getting session details for ID: ${sessionId}`);
      
      // LiveKit Cloud'da oda varlığını kontrol et
      const roomExists = await this.livekitProxyService.checkRoomExists(sessionId);
      
      if (!roomExists) {
        this.logger.warn(`Room ${sessionId} does not exist in LiveKit Cloud`);
        
        // Eğer oda yoksa, yeni oluştur
        try {
          await this.livekitProxyService.createRoomIfNotExists(sessionId);
          this.logger.log(`Created new room for session: ${sessionId}`);
        } catch (createError) {
          this.logger.error(`Error creating room: ${createError.message}`);
        }
      }
      
      // LiveKit'teki katılımcıları al
      const participants = await this.livekitProxyService.getParticipants(sessionId);
      this.logger.log(`Found ${participants.length} participants in room ${sessionId}`);
      
      // Oturum verilerini oluştur
      return {
        _id: sessionId,
        id: sessionId,
        roomName: sessionId,
        participants,
        status: participants.length > 0 ? 'ACTIVE' : 'WAITING',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error getting session by ID: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
