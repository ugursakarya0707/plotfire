import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  Request, 
  UseGuards, 
  NotFoundException, 
  BadRequestException,
  UnauthorizedException,
  Query
} from '@nestjs/common';
import { VideoSessionService } from '../services/video-session.service';
import { CreateVideoSessionDto } from '../dto/create-video-session.dto';
import { UpdateVideoSessionDto, VideoSessionStatus } from '../dto/update-video-session.dto';
import { VideoSession } from '../schemas/video-session.schema';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';

@Controller('video-sessions')
export class VideoSessionController {
  constructor(private readonly videoSessionService: VideoSessionService) {}

  @Post()
  @Public() 
  async create(
    @Body() createVideoSessionDto: CreateVideoSessionDto,
    @Request() req,
  ): Promise<VideoSession> {
    try {
      console.log('Received create video session request:', createVideoSessionDto);
      
      // Öğrenci kendi ID'sini gönderdiğinden emin ol
      if (req.user && req.user.userType === 'STUDENT' && req.user.id !== createVideoSessionDto.studentId) {
        throw new UnauthorizedException('You can only create sessions for yourself');
      }
      
      return await this.videoSessionService.create(createVideoSessionDto);
    } catch (error) {
      console.error('Error creating video session:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create video session: ${error.message}`);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req): Promise<VideoSession[]> {
    try {
      // Kullanıcı tipine göre oturumları getir
      if (req.user.userType === 'TEACHER') {
        return await this.videoSessionService.findAllByTeacherId(req.user.id);
      } else {
        return await this.videoSessionService.findAllByStudentId(req.user.id);
      }
    } catch (error) {
      throw new BadRequestException(`Failed to fetch video sessions: ${error.message}`);
    }
  }

  @Get(':id')
  @Public() 
  async findOne(@Param('id') id: string): Promise<VideoSession> {
    try {
      return await this.videoSessionService.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to fetch video session: ${error.message}`);
    }
  }

  @Put(':id/start')
  @Public() 
  async startSession(
    @Param('id') id: string,
    @Query('teacherName') teacherName: string,
    @Query('studentName') studentName: string,
  ): Promise<VideoSession> {
    try {
      return await this.videoSessionService.startSession(id, teacherName, studentName);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to start video session: ${error.message}`);
    }
  }

  @Get(':id/student-token')
  @Public() 
  async getStudentToken(
    @Param('id') id: string,
    @Query('studentName') studentName: string,
  ): Promise<{ token: string }> {
    try {
      const token = await this.videoSessionService.getStudentToken(id, studentName);
      return { token };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get student token: ${error.message}`);
    }
  }

  @Put(':id/complete')
  @UseGuards(JwtAuthGuard)
  async completeSession(@Param('id') id: string): Promise<VideoSession> {
    try {
      return await this.videoSessionService.updateStatus(id, VideoSessionStatus.COMPLETED);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to complete video session: ${error.message}`);
    }
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSession(@Param('id') id: string): Promise<VideoSession> {
    try {
      return await this.videoSessionService.updateStatus(id, VideoSessionStatus.CANCELLED);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to cancel video session: ${error.message}`);
    }
  }

  @Get('teacher/:teacherId/pending')
  @Public() 
  async findPendingByTeacherId(@Param('teacherId') teacherId: string): Promise<VideoSession[]> {
    try {
      return await this.videoSessionService.findPendingByTeacherId(teacherId);
    } catch (error) {
      throw new BadRequestException(`Failed to fetch pending sessions: ${error.message}`);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN') 
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.videoSessionService.remove(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete video session: ${error.message}`);
    }
  }
}
