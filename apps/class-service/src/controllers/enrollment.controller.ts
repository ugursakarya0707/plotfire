import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, UnauthorizedException, HttpStatus, HttpCode, ForbiddenException } from '@nestjs/common';
import { EnrollmentService } from '../services/enrollment.service';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from '../dtos/enrollment.dto';

@Controller('enrollments')
export class EnrollmentController {
  constructor(private enrollmentService: EnrollmentService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req): Promise<EnrollmentEntity[]> {
    // If user is a student, only return their enrollments
    if (req.user.userType === 'student') {
      return this.enrollmentService.findByStudentId(req.user.id);
    }
    // Otherwise return all enrollments (for admin/teacher)
    return this.enrollmentService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string, @Req() req): Promise<EnrollmentEntity> {
    const enrollment = await this.enrollmentService.findById(id);
    
    // Students can only view their own enrollments
    if (req.user.userType === 'student' && enrollment.studentId !== req.user.id) {
      throw new ForbiddenException('You can only view your own enrollments');
    }
    
    return enrollment;
  }

  @UseGuards(JwtAuthGuard)
  @Get('student/:studentId')
  async findByStudentId(@Param('studentId') studentId: string, @Req() req): Promise<EnrollmentEntity[]> {
    // Only allow students to view their own enrollments or teachers to view any student's enrollments
    if (req.user.userType === 'student' && req.user.id !== studentId) {
      throw new ForbiddenException('You can only view your own enrollments');
    }
    
    return this.enrollmentService.findByStudentId(studentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('class/:classId')
  async findByClassId(@Param('classId') classId: string, @Req() req): Promise<EnrollmentEntity[]> {
    // Teachers can view all enrollments for their classes
    // Students can only see if they are enrolled in the class
    if (req.user.userType === 'student') {
      const enrollments = await this.enrollmentService.findByStudentId(req.user.id);
      const isEnrolled = enrollments.some(e => e.classId === classId);
      
      if (!isEnrolled) {
        throw new ForbiddenException('You can only view enrollments for classes you are enrolled in');
      }
    }
    
    return this.enrollmentService.findByClassId(classId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() enrollmentData: CreateEnrollmentDto, @Req() req): Promise<EnrollmentEntity> {
    // Ensure the student ID is set from the authenticated user if they are a student
    if (req.user.userType === 'student') {
      enrollmentData.studentId = req.user.id;
    } else if (!enrollmentData.studentId) {
      throw new UnauthorizedException('Student ID is required for teacher-initiated enrollments');
    }
    
    return this.enrollmentService.create(enrollmentData);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() enrollmentData: UpdateEnrollmentDto,
    @Req() req,
  ): Promise<EnrollmentEntity> {
    // Get the enrollment to check if the user is the student
    const enrollment = await this.enrollmentService.findById(id);
    
    // Only allow students to update their own enrollments or teachers to update any enrollment
    if (req.user.userType === 'student' && enrollment.studentId !== req.user.id) {
      throw new ForbiddenException('You can only update your own enrollments');
    }
    
    return this.enrollmentService.update(id, enrollmentData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req): Promise<void> {
    // Get the enrollment to check if the user is the student
    const enrollment = await this.enrollmentService.findById(id);
    
    // Only allow students to delete their own enrollments or teachers to delete any enrollment
    if (req.user.userType === 'student' && enrollment.studentId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own enrollments');
    }
    
    return this.enrollmentService.delete(id);
  }
}
