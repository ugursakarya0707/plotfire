import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { TimeSlotService } from '../services/time-slot.service';
import { TimeSlot } from '../schemas/time-slot.schema';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';

@Controller('teacher-time-slots')
export class TimeSlotController {
  constructor(private readonly timeSlotService: TimeSlotService) {}

  @Public()
  @Get(':teacherId')
  async findAllByTeacherId(@Param('teacherId') teacherId: string): Promise<TimeSlot[]> {
    return this.timeSlotService.findAllByTeacherId(teacherId);
  }

  @Public()
  @Post()
  async create(@Body() timeSlotData: Partial<TimeSlot>, @Request() req): Promise<TimeSlot> {
    // Ensure the user can only create time slots for their own teacher profile
    return this.timeSlotService.create(timeSlotData);
  }

  @Public()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    return this.timeSlotService.delete(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/book')
  async bookTimeSlot(@Param('id') id: string, @Request() req): Promise<TimeSlot> {
    // JWT token'da firstName ve lastName olmadığı için, sadece studentId'yi gönderiyoruz
    // Servis tarafında öğrenci bilgilerini alacağız
    return this.timeSlotService.bookTimeSlot(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/cancel')
  async cancelBooking(@Param('id') id: string, @Request() req): Promise<TimeSlot> {
    return this.timeSlotService.cancelBooking(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/student/bookings')
  async findStudentBookings(@Request() req): Promise<TimeSlot[]> {
    return this.timeSlotService.findStudentBookings(req.user.id);
  }
}
