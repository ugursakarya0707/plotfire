import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LiveKitProxyService } from './livekit-proxy.service';
import { LiveKitController, LiveKitProxyController } from './livekit-proxy.controller';
import { VideoSessionsController } from './video-sessions.controller';
import { McpModule } from '../mcp/mcp.module';

@Module({
  imports: [HttpModule, McpModule],
  controllers: [LiveKitController, LiveKitProxyController, VideoSessionsController],
  providers: [LiveKitProxyService],
  exports: [LiveKitProxyService],
})
export class VideoConferenceModule {}
