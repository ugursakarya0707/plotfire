import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VideoConferenceModule } from './video-conference/video-conference.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    VideoConferenceModule,
    McpModule,
  ],
})
export class AppModule {}
