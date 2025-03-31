import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LiveKitProxyService } from './livekit-proxy.service';
import { LiveKitController } from './livekit.controller';
import { LiveKitProxyController } from './livekit-proxy.controller';
import { McpModule } from '../mcp/mcp.module';

@Module({
  imports: [HttpModule, McpModule],
  controllers: [LiveKitController, LiveKitProxyController],
  providers: [LiveKitProxyService],
  exports: [LiveKitProxyService],
})
export class VideoConferenceModule {}
