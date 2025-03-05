import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, UnauthorizedException, HttpStatus, HttpCode } from '@nestjs/common';
import { ClassService } from '../services/class.service';
import { ClassEntity } from '../entities/class.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateClassDto, UpdateClassDto } from '../dtos/class.dto';

@Controller('classes')
export class ClassController {
  constructor(private classService: ClassService) {}

  @Get()
  async findAll(): Promise<ClassEntity[]> {
    return this.classService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ClassEntity> {
    return this.classService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('teacher/:teacherId')
  async findByTeacherId(@Param('teacherId') teacherId: string): Promise<ClassEntity[]> {
    return this.classService.findByTeacherId(teacherId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() classData: CreateClassDto, @Req() req): Promise<ClassEntity> {
    // Ensure the teacher ID is set from the authenticated user
    const teacherId = req.user.id;
    return this.classService.create({ ...classData, teacherId });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() classData: UpdateClassDto,
    @Req() req,
  ): Promise<ClassEntity> {
    // Get the class to check if the user is the teacher
    const classEntity = await this.classService.findById(id);
    
    // Only allow the teacher to update their own class
    if (classEntity.teacherId !== req.user.id) {
      throw new UnauthorizedException('You can only update your own classes');
    }
    
    return this.classService.update(id, classData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req): Promise<void> {
    // Get the class to check if the user is the teacher
    const classEntity = await this.classService.findById(id);
    
    // Only allow the teacher to delete their own class
    if (classEntity.teacherId !== req.user.id) {
      throw new UnauthorizedException('You can only delete your own classes');
    }
    
    return this.classService.delete(id);
  }
}
