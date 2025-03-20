import { Controller, Get, Post, Body, Param, Put, Delete, Request, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { TeacherConferenceService } from '../services/teacher-conference.service';
import { CreateTeacherConferenceDto } from '../dto/create-teacher-conference.dto';
import { TeacherConference } from '../schemas/teacher-conference.schema';
import { Public } from '../decorators/public.decorator';

@Controller('teacher-conferences')
export class TeacherConferenceController {
  constructor(private readonly teacherConferenceService: TeacherConferenceService) {}

  @Post()
  async create(@Body() createTeacherConferenceDto: CreateTeacherConferenceDto): Promise<TeacherConference> {
    try {
      return await this.teacherConferenceService.create(createTeacherConferenceDto);
    } catch (error) {
      throw new BadRequestException(`Failed to create teacher conference: ${error.message}`);
    }
  }

  @Public()
  @Get()
  async findAll(): Promise<TeacherConference[]> {
    try {
      return await this.teacherConferenceService.findAll();
    } catch (error) {
      throw new BadRequestException(`Failed to get teacher conferences: ${error.message}`);
    }
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TeacherConference> {
    try {
      const teacherConference = await this.teacherConferenceService.findById(id);
      if (!teacherConference) {
        throw new NotFoundException(`Teacher conference with ID ${id} not found`);
      }
      return teacherConference;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get teacher conference: ${error.message}`);
    }
  }

  @Public()
  @Get('teacher/:teacherId')
  async findByTeacherId(@Param('teacherId') teacherId: string): Promise<TeacherConference> {
    try {
      const teacherConference = await this.teacherConferenceService.findByTeacherId(teacherId);
      if (!teacherConference) {
        throw new NotFoundException(`Teacher conference for teacher ID ${teacherId} not found`);
      }
      return teacherConference;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get teacher conference: ${error.message}`);
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTeacherConferenceDto: Partial<CreateTeacherConferenceDto>,
  ): Promise<TeacherConference> {
    try {
      const updatedConference = await this.teacherConferenceService.update(id, updateTeacherConferenceDto);
      if (!updatedConference) {
        throw new NotFoundException(`Teacher conference with ID ${id} not found`);
      }
      return updatedConference;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update teacher conference: ${error.message}`);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.teacherConferenceService.remove(id);
    } catch (error) {
      throw new BadRequestException(`Failed to delete teacher conference: ${error.message}`);
    }
  }

  @Put('teacher/me/online-status')
  async updateMyOnlineStatus(
    @Body('isOnline') isOnline: boolean,
    @Request() req
  ): Promise<TeacherConference> {
    try {
      console.log('updateMyOnlineStatus called with isOnline:', isOnline);
      console.log('User from request:', req.user);
      console.log('Request headers:', req.headers);
      
      // Kullanıcı kimliğini doğrula
      if (!req.user) {
        console.log('Authentication required, no user in request');
        throw new UnauthorizedException('Authentication required to update online status');
      }
      
      // Token'dan gelen kullanıcı ID'sini al (farklı formatlarda olabilir)
      const userId = req.user.id || req.user.userId || req.user.sub;
      console.log('User authenticated, userId:', userId);
      
      if (!userId) {
        console.log('User ID not found in token');
        throw new BadRequestException('User ID not found in token');
      }
      
      // Kullanıcının kendi öğretmen kaydını bul
      const teacherConference = await this.teacherConferenceService.findByTeacherId(userId);
      console.log('Teacher conference found:', teacherConference ? 'Yes' : 'No');
      
      if (!teacherConference) {
        console.log('Teacher conference not found for user:', userId);
        throw new NotFoundException(`Teacher conference not found for user ${userId}`);
      }
      
      // Öğretmen kaydını güncelle
      console.log('Updating online status for teacher:', userId);
      return await this.teacherConferenceService.updateOnlineStatus(userId, isOnline);
    } catch (error) {
      console.error('Error in updateMyOnlineStatus:', error);
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update online status: ${error.message}`);
    }
  }

  @Put('teacher/:teacherId/online-status')
  async updateOnlineStatus(
    @Param('teacherId') teacherId: string,
    @Body('isOnline') isOnline: boolean,
    @Request() req
  ): Promise<TeacherConference> {
    try {
      // Kullanıcı kimliğini doğrula
      if (req.user && req.user.userId) {
        // Kullanıcının kendi öğretmen kaydını bul
        const teacherConference = await this.teacherConferenceService.findByTeacherId(req.user.userId);
        
        if (!teacherConference) {
          throw new NotFoundException(`Teacher conference not found for user ${req.user.userId}`);
        }
        
        // Öğretmen kaydını güncelle
        return await this.teacherConferenceService.updateOnlineStatus(req.user.userId, isOnline);
      } else {
        throw new BadRequestException('Authentication required to update online status');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update online status: ${error.message}`);
    }
  }
}
