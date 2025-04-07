import { Controller, Post, Get, Body, Param, Logger, HttpException, HttpStatus, Put, Query } from '@nestjs/common';
import { LiveKitProxyService } from './livekit-proxy.service';
import { ObjectId } from 'mongodb';
import { McpService } from '../mcp/mcp.service';

@Controller('video-sessions')
export class VideoSessionsController {
  private readonly logger = new Logger(VideoSessionsController.name);

  constructor(
    private readonly livekitProxyService: LiveKitProxyService,
    private readonly mcpService: McpService
  ) {}

  // Yeni video konferans isteği oluşturma
  @Post()
  async createVideoSession(@Body() body: { teacherId: string; studentId: string; studentName?: string }) {
    try {
      const { teacherId, studentId, studentName } = body;
      this.logger.log(`Creating video session for teacher ${teacherId} and student ${studentId}`);

      // Benzersiz bir ID oluştur (MongoDB ObjectId formatında)
      const sessionId = new ObjectId().toString();
      const roomName = sessionId;
      const studentDisplayName = studentName || 'Öğrenci';

      // Oturum bilgilerini hazırla
      const sessionData = {
        _id: sessionId,
        id: sessionId,
        teacherId,
        studentId,
        studentName: studentDisplayName,
        roomName,
        status: 'WAITING',
        startTime: new Date().toISOString(),
        endTime: '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. LiveKit Cloud'da oda oluştur
      try {
        await this.livekitProxyService.createRoomIfNotExists(roomName, sessionData);
        this.logger.log(`Room created for session ${sessionId}`);
      } catch (roomError) {
        this.logger.warn(`Error creating room: ${roomError.message}, but continuing`);
      }

      // 2. Öğrenci için token oluştur
      let studentToken = '';
      try {
        studentToken = await this.livekitProxyService.createToken(roomName, studentDisplayName, false);
        this.logger.log(`Token created for student in session ${sessionId}`);
      } catch (tokenError) {
        this.logger.warn(`Error creating student token: ${tokenError.message}, but continuing`);
      }

      // 3. Oturum verilerini MCP'ye kaydet
      try {
        await this.mcpService.updateVideoSessionData(sessionId, sessionData);
        this.logger.log(`Session data saved to MCP for ${sessionId}`);
      } catch (mcpError) {
        this.logger.warn(`Error saving session data to MCP: ${mcpError.message}, but continuing`);
      }

      // 4. Öğretmene bildirim gönderme işlemini başlat
      try {
        const notificationResult = await this.livekitProxyService.notifyTeacher(
          teacherId,
          sessionId,
          'student_joined'
        );
        
        this.logger.log(`Teacher notification result: ${JSON.stringify(notificationResult)}`);
        
        if (notificationResult && notificationResult.success) {
          this.logger.log(`Successfully notified teacher ${teacherId} about session ${sessionId}`);
        } else {
          this.logger.warn(`Failed to notify teacher ${teacherId}`);
        }
      } catch (notificationError) {
        this.logger.error(`Error notifying teacher: ${notificationError.message}`);
      }

      // 5. Öğrenci token'ı ile birlikte oturum bilgilerini döndür
      return {
        ...sessionData,
        studentToken,
        roomToken: studentToken // Frontend'in beklediği format için
      };
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
      
      this.logger.log(`Received request to notify teacher ${teacherId} about session ${sessionId} with action ${action || 'student_joined'}`);
      
      if (!teacherId || !sessionId) {
        throw new HttpException(
          'Teacher ID and Session ID are required',
          HttpStatus.BAD_REQUEST
        );
      }
      
      // 1. Önce odanın var olup olmadığını kontrol et
      let roomExists = false;
      try {
        roomExists = await this.livekitProxyService.checkRoomExists(sessionId);
        this.logger.log(`Room existence check for ${sessionId}: ${roomExists}`);
      } catch (roomError) {
        this.logger.warn(`Error checking room existence: ${roomError.message}, continuing anyway`);
      }
      
      // 2. LiveKitProxyService üzerinden öğretmene bildirim gönder
      try {
        const notificationResult = await this.livekitProxyService.notifyTeacher(
          teacherId, 
          sessionId, 
          action || 'student_joined'
        );
        
        this.logger.log(`Notification result: ${JSON.stringify(notificationResult)}`);
        
        // 3. Bildirim sonucunu kontrol et
        if (notificationResult && notificationResult.success) {
          this.logger.log(`Teacher ${teacherId} successfully notified about session ${sessionId}`);
          
          // 4. Bildirim doğrulaması yapıldıysa ve başarısızsa, alternatif yöntem dene
          if (notificationResult.verified === false) {
            this.logger.warn(`Notification verification failed, trying alternative method`);
            
            // 5. Alternatif olarak, öğretmenin bekleyen oturumlarını zorla yenile
            try {
              const refreshResult = await this.mcpService.refreshTeacherPendingSessions(teacherId);
              this.logger.log(`Refresh result: ${JSON.stringify(refreshResult)}`);
              
              if (refreshResult && refreshResult.success) {
                this.logger.log(`Successfully refreshed teacher ${teacherId} pending sessions`);
                
                // 6. Yenileme başarılıysa, bildirim sonucunu güncelle
                notificationResult.refreshed = true;
                notificationResult.refreshResult = refreshResult;
              } else {
                this.logger.warn(`Failed to refresh teacher pending sessions: ${JSON.stringify(refreshResult)}`);
              }
            } catch (refreshError) {
              this.logger.warn(`Failed to refresh teacher pending sessions: ${refreshError.message}`);
            }
          }
          
          return { 
            ...notificationResult,
            roomExists
          };
        } else {
          throw new Error('Notification failed or returned invalid result');
        }
      } catch (notifyError) {
        this.logger.error(`Error in LiveKitProxyService.notifyTeacher: ${notifyError.message}`);
        
        // 6. LiveKitProxyService üzerinden bildirim başarısız olduysa, doğrudan MCP servisini dene
        try {
          this.logger.log(`Trying direct MCP service notification for teacher ${teacherId}`);
          
          const pendingSession = {
            _id: sessionId,
            id: sessionId,
            teacherId,
            status: 'WAITING',
            isActive: true,
            timestamp: new Date().toISOString(),
            action: action || 'student_joined'
          };
          
          const mcpResult = await this.mcpService.updateTeacherPendingSessions(teacherId, pendingSession);
          this.logger.log(`MCP update result: ${JSON.stringify(mcpResult)}`);
          
          if (mcpResult && mcpResult.success) {
            this.logger.log(`Successfully updated teacher ${teacherId} pending sessions via direct MCP call`);
            
            // 7. Doğrulama: Bildirim başarıyla gönderildi mi kontrol et
            let verified = false;
            try {
              // Kısa bir bekleme süresi ekle - veritabanı güncellemesinin tamamlanması için
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Öğretmenin bekleyen oturumlarını kontrol et
              const pendingSessions = await this.mcpService.getTeacherPendingSessions(teacherId);
              
              // Oturum listede var mı kontrol et
              if (pendingSessions && Array.isArray(pendingSessions)) {
                verified = pendingSessions.some(session => 
                  (session._id === sessionId || session.id === sessionId) && 
                  session.teacherId === teacherId &&
                  session.isActive !== false
                );
                
                if (verified) {
                  this.logger.log(`Verification successful: Session ${sessionId} found in teacher ${teacherId}'s pending sessions`);
                } else {
                  this.logger.warn(`Verification failed: Session ${sessionId} not found in teacher ${teacherId}'s pending sessions`);
                }
              }
            } catch (verifyError) {
              this.logger.warn(`Error verifying notification: ${verifyError.message}`);
            }
            
            return { 
              success: true, 
              verified,
              method: 'direct-mcp',
              message: `Teacher ${teacherId} notified about session ${sessionId} via direct MCP call`,
              timestamp: new Date().toISOString(),
              action: action || 'student_joined',
              roomExists
            };
          } else {
            this.logger.error(`Error in direct MCP notification: ${JSON.stringify(mcpResult)}`);
            throw new Error(`MCP update failed: ${JSON.stringify(mcpResult)}`);
          }
        } catch (mcpError) {
          this.logger.error(`Error in direct MCP notification: ${mcpError.message}`);
          throw notifyError; // Orijinal hatayı fırlat
        }
      }
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
      this.logger.log(`Getting pending sessions for teacher ${teacherId}, force=${force}`);
      
      // Eğer force parametresi varsa, MCP servisini kullanarak bekleyen oturumları zorla yenile
      if (force === 'true') {
        try {
          this.logger.log(`Force refreshing pending sessions for teacher ${teacherId}`);
          
          // MCP servisini kullanarak bekleyen oturumları zorla yenile
          await this.mcpService.refreshTeacherPendingSessions(teacherId);
          
          this.logger.log(`Successfully forced refresh of pending sessions for teacher ${teacherId}`);
        } catch (refreshError) {
          this.logger.warn(`Error force refreshing sessions: ${refreshError.message}, but continuing`);
        }
      }
      
      // Sadece gerçek öğrenci isteklerini al
      const studentInitiatedSessions = await this.livekitProxyService.getStudentInitiatedSessions(teacherId);
      this.logger.log(`Found ${studentInitiatedSessions.length} student-initiated sessions for teacher ${teacherId}`);
      
      return studentInitiatedSessions;
    } catch (error) {
      this.logger.error(`Error getting pending sessions for teacher ${teacherId}: ${error.message}`);
      
      // Hata durumunda boş bir dizi döndür
      return [];
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
      
      // MongoDB veya başka bir veritabanı kullanmadığımız için
      // global bir değişken veya in-memory storage kullanarak durumu takip edelim
      // Bu, test amaçlı geçici bir çözümdür
      global.sessionStatuses = global.sessionStatuses || {};
      global.sessionStatuses[sessionId] = updateData.status;
      
      this.logger.log(`Session ${sessionId} status updated to ${updateData.status} in memory`);
      
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
        roomToken: token, // Frontend'in beklediği format için
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
      
      // Oturum durumunu in-memory storage'dan al
      const status = global.sessionStatuses && global.sessionStatuses[sessionId] 
        ? global.sessionStatuses[sessionId] 
        : 'WAITING';
      
      // LiveKit'te oda var mı kontrol et
      const roomExists = await this.livekitProxyService.checkRoomExists(sessionId);
      
      // Katılımcıları al
      let participants = [];
      if (roomExists) {
        try {
          participants = await this.livekitProxyService.getParticipants(sessionId);
        } catch (participantsError) {
          this.logger.warn(`Error getting participants: ${participantsError.message}`);
        }
      }
      
      // MCP'den oturum bilgilerini al
      let sessionDetails = null;
      try {
        sessionDetails = await this.mcpService.getVideoSessionInfo(sessionId);
        this.logger.log(`Retrieved session details from MCP for ${sessionId}`);
      } catch (sessionError) {
        this.logger.warn(`Error getting session details from MCP: ${sessionError.message}`);
      }
      
      return {
        success: true,
        sessionId,
        status,
        roomExists,
        participants,
        roomName: sessionId,
        ...(sessionDetails || {}),
        message: `Session details for ${sessionId} retrieved successfully`
      };
    } catch (error) {
      this.logger.error(`Error getting session details: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get session details: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
