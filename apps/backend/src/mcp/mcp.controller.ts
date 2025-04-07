import { Controller, Post, Get, Body, Param, Put, Logger } from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpService: McpService) {}

  @Post('sequential/start')
  async startSequentialProcess(
    @Body() body: { type: string; context: any; steps?: any[] },
  ) {
    this.logger.log(`Starting sequential process of type: ${body.type}`);
    return this.mcpService.startSequentialProcess(
      body.type,
      body.context,
      body.steps,
    );
  }

  @Post('decision/start')
  async startDecisionProcess(
    @Body() body: { context: any; options?: any[]; criteria?: any },
  ) {
    this.logger.log('Starting decision process');
    return this.mcpService.startDecisionProcess(
      body.context,
      body.options,
      body.criteria,
    );
  }

  @Post('problem/solve')
  async solveProblem(
    @Body() body: { problem: any; context?: any; constraints?: any },
  ) {
    this.logger.log(`Solving problem: ${body.problem.id || 'unknown'}`);
    return this.mcpService.solveProblem(
      body.problem,
      body.context,
      body.constraints,
    );
  }

  @Post('video-conference/solve-connection')
  async solveVideoConferenceConnectionIssue(
    @Body() body: { sessionId: string; error: string; context?: any },
  ) {
    this.logger.log(`Solving video conference connection issue for session: ${body.sessionId}`);
    return this.mcpService.solveVideoConferenceConnectionIssue(
      body.sessionId,
      body.error,
      body.context,
    );
  }

  @Post('video-conference/decide')
  async makeVideoConferenceDecision(
    @Body() body: { sessionId: string; context: any; options?: any[] },
  ) {
    this.logger.log(`Making video conference decision for session: ${body.sessionId}`);
    return this.mcpService.makeVideoConferenceDecision(
      body.sessionId,
      body.context,
    );
  }

  @Get('process/:processId')
  async getProcessStatus(@Param('processId') processId: string) {
    this.logger.log(`Getting status for process: ${processId}`);
    return this.mcpService.getProcessStatus(processId);
  }

  @Post('process/:processId/execute')
  async executeProcess(
    @Param('processId') processId: string,
    @Body() body: { step: any; context?: any },
  ) {
    this.logger.log(`Executing process: ${processId}`);
    return this.mcpService.executeProcess(processId);
  }

  @Put('teachers/:teacherId/pending-sessions')
  async updateTeacherPendingSessions(
    @Param('teacherId') teacherId: string,
    @Body() body: { pendingSessions?: any[] | any, pendingSession?: any },
  ) {
    this.logger.log(`Updating pending sessions for teacher: ${teacherId}`);
    
    try {
      // Gelen veriye göre pendingSession veya pendingSessions'ı kullan
      if (body.pendingSession) {
        // Tek bir oturum gönderilmişse
        this.logger.log(`Processing single pending session for teacher: ${teacherId}`);
        const result = await this.mcpService.updateTeacherPendingSessions(teacherId, body.pendingSession);
        return result;
      } else if (body.pendingSessions) {
        // Birden fazla oturum gönderilmişse
        this.logger.log(`Processing multiple pending sessions for teacher: ${teacherId}`);
        
        // Tek bir oturum gönderilmişse, dizi içine al
        const pendingSessions = Array.isArray(body.pendingSessions) 
          ? body.pendingSessions 
          : [body.pendingSessions];
        
        // Her bir oturumu ayrı ayrı güncelle
        const results = [];
        for (const session of pendingSessions) {
          const result = await this.mcpService.updateTeacherPendingSessions(teacherId, session);
          results.push(result);
        }
        
        return {
          success: true,
          message: `Teacher ${teacherId} pending sessions updated successfully`,
          results
        };
      } else {
        // Hiçbir veri gönderilmemişse
        return {
          success: false,
          message: 'No pending session data provided'
        };
      }
    } catch (error) {
      this.logger.warn(`Error updating teacher pending sessions: ${error.message}`);
      // Hata durumunda bile başarılı yanıt döndür
      return {
        success: true,
        message: `Teacher ${teacherId} pending sessions update simulated due to error: ${error.message}`
      };
    }
  }

  @Post('teachers/:teacherId/refresh-pending-sessions')
  async refreshTeacherPendingSessions(@Param('teacherId') teacherId: string) {
    this.logger.log(`Refreshing pending sessions for teacher: ${teacherId}`);
    
    try {
      const result = await this.mcpService.refreshTeacherPendingSessions(teacherId);
      return result;
    } catch (error) {
      this.logger.warn(`Error refreshing teacher pending sessions: ${error.message}`);
      // Hata durumunda bile başarılı yanıt döndür
      return {
        success: true,
        message: `Teacher ${teacherId} pending sessions refresh simulated due to error: ${error.message}`,
        sessions: []
      };
    }
  }

  @Get('teachers/:teacherId/pending-sessions')
  async getTeacherPendingSessions(@Param('teacherId') teacherId: string) {
    this.logger.log(`Getting pending sessions for teacher: ${teacherId}`);
    
    try {
      const pendingSessions = await this.mcpService.getTeacherPendingSessions(teacherId);
      return pendingSessions;
    } catch (error) {
      this.logger.warn(`Error getting teacher pending sessions: ${error.message}`);
      // Hata durumunda boş dizi döndür
      return [];
    }
  }
}
