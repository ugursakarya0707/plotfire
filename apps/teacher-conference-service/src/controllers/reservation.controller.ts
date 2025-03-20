import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { ReservationService } from '../services/reservation.service';
import { Reservation } from '../schemas/reservation.schema';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ReservationStatus } from '../schemas/reservation.schema';

@Controller('teacher-reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':teacherId')
  async findAllByTeacherId(@Param('teacherId') teacherId: string, @Request() req): Promise<Reservation[]> {
    // Verify that the user is requesting their own reservations
    if (req.user.id !== teacherId) {
      return [];
    }
    return this.reservationService.findAllByTeacherId(teacherId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('student/:studentId')
  async findAllByStudentId(@Param('studentId') studentId: string, @Request() req): Promise<Reservation[]> {
    // Verify that the user is requesting their own reservations
    if (req.user.id !== studentId) {
      return [];
    }
    return this.reservationService.findAllByStudentId(studentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('book/:timeSlotId')
  async bookTimeSlot(@Param('timeSlotId') timeSlotId: string, @Request() req): Promise<Reservation> {
    return this.reservationService.create(
      timeSlotId, 
      req.user.id, 
      `${req.user.firstName} ${req.user.lastName}`
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put(':reservationId/status')
  async updateStatus(
    @Param('reservationId') reservationId: string, 
    @Body() body: { status: ReservationStatus }, 
    @Request() req
  ): Promise<Reservation> {
    return this.reservationService.updateStatus(reservationId, body.status, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReservation(@Param('reservationId') reservationId: string, @Request() req): Promise<void> {
    return this.reservationService.delete(reservationId, req.user.id);
  }
}
