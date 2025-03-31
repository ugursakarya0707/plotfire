import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { LiveKitProxyService } from './livekit-proxy.service';

@Controller('video-conference/livekit')
export class LiveKitController {
  private readonly logger = new Logger(LiveKitController.name);

  constructor(private readonly livekitProxyService: LiveKitProxyService) {}

  @Post('initialize')
  async initializeSession(
    @Body() body: { sessionId: string; userName: string; isTeacher: boolean },
  ) {
    this.logger.log(`Initializing LiveKit session for ${body.userName} in room ${body.sessionId}`);
    const token = await this.livekitProxyService.initializeSession(
      body.sessionId,
      body.userName,
      body.isTeacher,
    );
    return { token };
  }

  @Get('participants/:sessionId')
  async getParticipants(@Param('sessionId') sessionId: string) {
    this.logger.log(`Getting participants for session ${sessionId}`);
    const participants = await this.livekitProxyService.getParticipants(sessionId);
    return { participants };
  }

  @Post('end')
  async endSession(@Body() body: { sessionId: string }) {
    this.logger.log(`Ending session ${body.sessionId}`);
    await this.livekitProxyService.endSession(body.sessionId);
    return { success: true };
  }

  @Post('toggle-camera')
  async toggleCamera(
    @Body() body: { sessionId: string; identity: string; enabled: boolean },
  ) {
    this.logger.log(`Toggling camera for ${body.identity} in session ${body.sessionId}`);
    await this.livekitProxyService.toggleCamera(
      body.sessionId,
      body.identity,
      body.enabled,
    );
    return { success: true };
  }

  @Post('toggle-microphone')
  async toggleMicrophone(
    @Body() body: { sessionId: string; identity: string; enabled: boolean },
  ) {
    this.logger.log(`Toggling microphone for ${body.identity} in session ${body.sessionId}`);
    await this.livekitProxyService.toggleMicrophone(
      body.sessionId,
      body.identity,
      body.enabled,
    );
    return { success: true };
  }
}
