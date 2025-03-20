import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reservation, ReservationDocument, ReservationStatus } from '../schemas/reservation.schema';
import { TimeSlot, TimeSlotDocument } from '../schemas/time-slot.schema';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
    @InjectModel(TimeSlot.name) private timeSlotModel: Model<TimeSlotDocument>,
  ) {}

  async findAllByTeacherId(teacherId: string): Promise<Reservation[]> {
    return this.reservationModel.find({ teacherId }).sort({ date: 1, startTime: 1 }).exec();
  }

  async findAllByStudentId(studentId: string): Promise<Reservation[]> {
    return this.reservationModel.find({ studentId }).sort({ date: 1, startTime: 1 }).exec();
  }

  async findById(id: string): Promise<ReservationDocument> {
    const reservation = await this.reservationModel.findById(id).exec();
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
    return reservation;
  }

  async create(timeSlotId: string, studentId: string, studentName: string): Promise<Reservation> {
    // Find the time slot
    const timeSlot = await this.timeSlotModel.findById(timeSlotId).exec();
    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${timeSlotId} not found`);
    }

    // Check if time slot is already booked
    if (timeSlot.isBooked) {
      throw new BadRequestException('This time slot is already booked');
    }

    // Create a new reservation
    const newReservation = new this.reservationModel({
      teacherId: timeSlot.teacherId,
      studentId,
      studentName,
      timeSlotId,
      date: timeSlot.date,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      status: ReservationStatus.SCHEDULED,
    });

    // Save the reservation
    const savedReservation = await newReservation.save();

    // Update the time slot as booked
    timeSlot.isBooked = true;
    timeSlot.studentId = studentId;
    timeSlot.studentName = studentName;
    await timeSlot.save();

    return savedReservation;
  }

  async updateStatus(id: string, status: ReservationStatus, userId: string): Promise<Reservation> {
    const reservation = await this.findById(id);

    // Verify that the user is either the teacher or the student of this reservation
    if (reservation.teacherId !== userId && reservation.studentId !== userId) {
      throw new ForbiddenException('You can only update your own reservations');
    }

    // Only allow teacher to mark as completed
    if (status === ReservationStatus.COMPLETED && reservation.teacherId !== userId) {
      throw new ForbiddenException('Only teachers can mark reservations as completed');
    }

    // Update the reservation status
    reservation.status = status;
    const updatedReservation = await reservation.save();

    // If the reservation is cancelled, also update the time slot
    if (status === ReservationStatus.CANCELLED) {
      const timeSlot = await this.timeSlotModel.findById(reservation.timeSlotId).exec();
      if (timeSlot) {
        timeSlot.isBooked = false;
        timeSlot.studentId = null;
        timeSlot.studentName = null;
        await timeSlot.save();
      }
    }

    return updatedReservation;
  }

  async delete(id: string, userId: string): Promise<void> {
    const reservation = await this.findById(id);

    // Only allow deletion if the user is the teacher or student of this reservation
    if (reservation.teacherId !== userId && reservation.studentId !== userId) {
      throw new ForbiddenException('You can only delete your own reservations');
    }

    // If the reservation is still scheduled, free up the time slot
    if (reservation.status === ReservationStatus.SCHEDULED) {
      const timeSlot = await this.timeSlotModel.findById(reservation.timeSlotId).exec();
      if (timeSlot) {
        timeSlot.isBooked = false;
        timeSlot.studentId = null;
        timeSlot.studentName = null;
        await timeSlot.save();
      }
    }

    const result = await this.reservationModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
  }
}
