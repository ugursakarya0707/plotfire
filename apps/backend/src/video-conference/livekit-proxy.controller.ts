import { Controller, Get, Post, Put, Body, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { LiveKitProxyService } from './livekit-proxy.service';

// Orijinal controller (eski istekler için çalışmaya devam ediyor)
@Controller('video-conference/livekit')
export class LiveKitController {
  private readonly logger = new Logger(LiveKitController.name);
  
  constructor(private readonly livekitProxyService: LiveKitProxyService) {}

  @Get('participants/:roomName')
  async getParticipants(@Param('roomName') roomName: string) {
    try {
      const participants = await this.livekitProxyService.getParticipants(roomName);
      return { participants };
    } catch (error) {
      this.logger.error(`Error getting participants: ${error.message}`);
      throw new HttpException(
        `Failed to get participants: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('token')
  async createToken(@Body() body: { roomName: string; participantName: string; isTeacher: boolean }) {
    try {
      const { roomName, participantName, isTeacher } = body;
      this.logger.log(`Creating token for ${participantName} in room ${roomName}, isTeacher: ${isTeacher}`);
      const token = await this.livekitProxyService.createToken(roomName, participantName, isTeacher);
      return { token };
    } catch (error) {
      this.logger.error(`Error creating token: ${error.message}`);
      throw new HttpException(
        `Failed to create token: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('connect')
  async connectToLiveKit(@Body() body: { sessionId: string; userName: string; role: string }) {
    try {
      const { sessionId, userName, role } = body;
      const result = await this.livekitProxyService.connectToLiveKit(sessionId, userName, role);
      return result;
    } catch (error) {
      console.error(`Error connecting to LiveKit: ${error.message}`);
      throw new HttpException(
        `Failed to connect to LiveKit: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('toggle-camera')
  async toggleCamera(@Body() body: { roomName: string; identity: string; enabled: boolean }) {
    try {
      const { roomName, identity, enabled } = body;
      await this.livekitProxyService.toggleCamera(roomName, identity, enabled);
      return { success: true };
    } catch (error) {
      console.error(`Error toggling camera: ${error.message}`);
      throw new HttpException(
        `Failed to toggle camera: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('toggle-microphone')
  async toggleMicrophone(@Body() body: { roomName: string; identity: string; enabled: boolean }) {
    try {
      const { roomName, identity, enabled } = body;
      await this.livekitProxyService.toggleMicrophone(roomName, identity, enabled);
      return { success: true };
    } catch (error) {
      console.error(`Error toggling microphone: ${error.message}`);
      throw new HttpException(
        `Failed to toggle microphone: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('end-session')
  async endSession(@Body() body: { sessionId: string; reason?: string }) {
    try {
      const { sessionId, reason } = body;
      console.log(`Ending session: ${sessionId}, reason: ${reason || 'normal end'}`);
      
      const result = await this.livekitProxyService.endSession(sessionId, reason);
      return result;
    } catch (error) {
      console.error(`Error ending session: ${error.message}`);
      throw new HttpException(
        `Failed to end session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('register-student-session')
  async registerStudentSession(@Body() body: { sessionId: string; teacherId: string; studentId: string; action?: string }) {
    try {
      const { sessionId, teacherId, studentId, action } = body;
      console.log(`Registering student session: ${sessionId} for teacher: ${teacherId}, student: ${studentId}, action: ${action || 'join'}`);
      
      // Oturumu kaydet ve öğretmene bildirim gönder
      const result = await this.livekitProxyService.registerStudentSession(sessionId, teacherId, studentId, action);
      return result;
    } catch (error) {
      console.error(`Error registering student session: ${error.message}`);
      throw new HttpException(
        `Failed to register student session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('notify-teacher')
  async notifyTeacher(@Body() body: { teacherId: string; sessionId: string; action?: string }) {
    try {
      const { teacherId, sessionId, action } = body;
      console.log(`[LiveKitProxyController] Notifying teacher ${teacherId} about session ${sessionId} with action ${action || 'join'}`);
      
      // Öğretmene bildirim gönder
      const result = await this.livekitProxyService.notifyTeacher(teacherId, sessionId, action);
      return result;
    } catch (error) {
      console.error(`Error notifying teacher: ${error.message}`);
      throw new HttpException(
        `Failed to notify teacher: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

// Yeni controller (frontend'in yeni istekleri için)
@Controller('livekit-proxy')
export class LiveKitProxyController {
  private readonly logger = new Logger(LiveKitProxyController.name);
  
  constructor(private readonly livekitProxyService: LiveKitProxyService) {}
  
  @Post('token')
  async createToken(@Body() body: { roomName: string; participantName: string; isTeacher: boolean }) {
    try {
      const { roomName, participantName, isTeacher } = body;
      this.logger.log(`[Proxy] Creating token for ${participantName} in room ${roomName}, isTeacher: ${isTeacher}`);
      const token = await this.livekitProxyService.createToken(roomName, participantName, isTeacher);
      return { token };
    } catch (error) {
      this.logger.error(`Error creating token: ${error.message}`);
      throw new HttpException(
        `Failed to create token: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('register-student-session')
  async registerStudentSession(@Body() payload: any) {
    try {
      this.logger.log(`[Proxy] Registering student session: ${JSON.stringify(payload)}`);
      
      const { sessionId, teacherId, studentId, action } = payload;
      
      if (!sessionId || !teacherId || !studentId) {
        throw new HttpException(
          'Missing required fields (sessionId, teacherId, studentId)',
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Öğrenci oturumunu kaydet
      await this.livekitProxyService.registerStudentSession(sessionId, teacherId, studentId, action);
      
      // Sistemdeki kayıtlı oturumları güncelle (hem MCP hem de LiveKit)
      try {
        // Oturum bilgisini get
        const sessionInfo = await this.livekitProxyService.getMcpService().getVideoSessionInfo(sessionId);
        
        // LiveKit odasını oluştur veya güncelle
        if (sessionInfo && sessionInfo.roomName) {
          await this.livekitProxyService.createRoomIfNotExists(sessionInfo.roomName, {
            teacherId,
            studentId,
            sessionId,
            action: action || 'session_created'
          });
        }
      } catch (updateError) {
        this.logger.warn(`Error updating LiveKit room: ${updateError.message}`);
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
  
  @Get('teacher-sessions/:teacherId') 
  async getTeacherSessions(@Param('teacherId') teacherId: string) {
    try {
      this.logger.log(`[Proxy] Getting sessions for teacher: ${teacherId}`);
      
      // Öğretmen için kayıtlı oturumları getir
      const sessions = await this.livekitProxyService.getTeacherPendingSessions(teacherId);
      return { sessions };
    } catch (error) {
      this.logger.error(`Error getting teacher sessions: ${error.message}`);
      throw new HttpException(
        `Failed to get teacher sessions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('debug-all-sessions')
  async debugAllSessions() {
    try {
      this.logger.log('[DEBUG] Fetching all sessions data for debugging');
      
      // MCP servisinden doğrudan tüm oturum verilerini getir
      const allSessions = await this.livekitProxyService.getMcpService().getAllVideoSessions();
      
      // Detaylı bilgi ekle
      return { 
        count: allSessions.length,
        sessions: allSessions,
        info: 'Bu endpoint sadece debug amaçlıdır'
      };
    } catch (error) {
      this.logger.error(`[DEBUG] Error getting all sessions: ${error.message}`);
      throw new HttpException(
        `Debug error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
