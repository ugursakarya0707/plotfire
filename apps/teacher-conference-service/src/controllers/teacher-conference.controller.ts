import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, NotFoundException, BadRequestException } from '@nestjs/common';
import { TeacherConferenceService } from '../services/teacher-conference.service';
import { CreateTeacherConferenceDto } from '../dto/create-teacher-conference.dto';
import { TeacherConference } from '../schemas/teacher-conference.schema';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('teacher-conferences')
export class TeacherConferenceController {
  constructor(private readonly teacherConferenceService: TeacherConferenceService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createTeacherConferenceDto: CreateTeacherConferenceDto): Promise<TeacherConference> {
    try {
      return await this.teacherConferenceService.create(createTeacherConferenceDto);
    } catch (error) {
      throw new BadRequestException(`Failed to create teacher conference: ${error.message}`);
    }
  }

  @Get()
  async findAll(): Promise<TeacherConference[]> {
    try {
      return await this.teacherConferenceService.findAll();
    } catch (error) {
      throw new BadRequestException(`Failed to fetch teacher conferences: ${error.message}`);
    }
  }

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
      throw new BadRequestException(`Failed to fetch teacher conference: ${error.message}`);
    }
  }

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
      throw new BadRequestException(`Failed to fetch teacher conference: ${error.message}`);
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.teacherConferenceService.remove(id);
    } catch (error) {
      throw new BadRequestException(`Failed to delete teacher conference: ${error.message}`);
    }
  }
}
