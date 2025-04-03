import { Controller, Get, Post, Put, Body, Param, HttpException, HttpStatus, Logger, Query, Logger as NestLogger } from '@nestjs/common';
import { LiveKitProxyService } from './livekit-proxy.service';

// Orijinal controller (eski istekler için çalışmaya devam ediyor)
@Controller('video-conference/livekit')
export class LiveKitController {
  private readonly logger: NestLogger = new NestLogger(LiveKitController.name);
  
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
  private readonly logger: NestLogger = new NestLogger(LiveKitProxyController.name);
  
  constructor(private readonly livekitProxyService: LiveKitProxyService) {}
  
  @Get('debug')
  async getDebugInfo() {
    try {
      const activeRooms = await this.livekitProxyService.getActiveRooms();
      return { activeRooms };
    } catch (error) {
      this.logger.error(`Error getting debug info: ${error.message}`);
      throw new HttpException(
        `Failed to get debug info: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('teacher-sessions/:teacherId')
  async getTeacherPendingSessions(@Param('teacherId') teacherId: string) {
    try {
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
  
  @Post('register-student-session')
  async registerStudentSession(@Body() body: { sessionId: string; teacherId: string; studentId: string; action?: string }) {
    try {
      const { sessionId, teacherId, studentId, action } = body;
      const result = await this.livekitProxyService.registerStudentSession(sessionId, teacherId, studentId, action || 'join');
      return result;
    } catch (error) {
      this.logger.error(`Error registering student session: ${error.message}`);
      throw new HttpException(
        `Failed to register student session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('token')
  async createTokenPost(@Body() body: { roomName: string; participantName: string; isTeacher: boolean }) {
    try {
      const { roomName, participantName, isTeacher } = body;
      this.logger.log(`Creating token for ${participantName} in room ${roomName}, isTeacher: ${isTeacher}`);
      
      const token = await this.livekitProxyService.createToken(roomName, participantName, isTeacher);
      
      return { 
        success: true,
        token, 
        roomName,
        userName: participantName,
        role: isTeacher ? 'teacher' : 'student'
      };
    } catch (error) {
      this.logger.error(`Error creating token: ${error.message}`);
      throw new HttpException(
        `Failed to create token: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('token')
  async getToken(
    @Query('room') roomName: string,
    @Query('username') username: string,
    @Query('isTeacher') isTeacher: string
  ) {
    try {
      const isTeacherBool = isTeacher === 'true';
      this.logger.log(`Creating token for ${username} in room ${roomName}, isTeacher: ${isTeacherBool}`);
      
      const token = await this.livekitProxyService.createToken(roomName, username, isTeacherBool);
      
      return { 
        success: true,
        token, 
        roomName,
        userName: username,
        role: isTeacherBool ? 'teacher' : 'student'
      };
    } catch (error) {
      this.logger.error(`Error creating token: ${error.message}`);
      throw new HttpException(
        `Failed to create token: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
