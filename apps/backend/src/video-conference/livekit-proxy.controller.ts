import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { LiveKitProxyService } from './livekit-proxy.service';

@Controller('video-conference/livekit')
export class LiveKitProxyController {
  constructor(private readonly livekitProxyService: LiveKitProxyService) {}

  @Get('participants/:roomName')
  async getParticipants(@Param('roomName') roomName: string) {
    try {
      const participants = await this.livekitProxyService.getParticipants(roomName);
      return { participants };
    } catch (error) {
      console.error(`Error getting participants: ${error.message}`);
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
      const token = await this.livekitProxyService.createToken(roomName, participantName, isTeacher);
      return { token };
    } catch (error) {
      console.error(`Error creating token: ${error.message}`);
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
  async endSession(@Body() body: { roomName: string }) {
    try {
      const { roomName } = body;
      await this.livekitProxyService.endSession(roomName);
      return { success: true };
    } catch (error) {
      console.error(`Error ending session: ${error.message}`);
      throw new HttpException(
        `Failed to end session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
