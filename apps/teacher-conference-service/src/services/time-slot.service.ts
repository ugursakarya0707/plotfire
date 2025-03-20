import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TimeSlot, TimeSlotDocument } from '../schemas/time-slot.schema';
import { TeacherConference, TeacherConferenceDocument } from '../schemas/teacher-conference.schema';
import { Reservation, ReservationDocument, ReservationStatus } from '../schemas/reservation.schema';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TimeSlotService {
  constructor(
    @InjectModel(TimeSlot.name) private timeSlotModel: Model<TimeSlotDocument>,
    @InjectModel(TeacherConference.name) private teacherConferenceModel: Model<TeacherConferenceDocument>,
    @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
    private configService: ConfigService,
  ) {}

  async findAllByTeacherId(teacherId: string): Promise<TimeSlot[]> {
    return this.timeSlotModel.find({ teacherId }).sort({ date: 1, startTime: 1 }).exec();
  }

  async findById(id: string): Promise<TimeSlotDocument> {
    const timeSlot = await this.timeSlotModel.findById(id).exec();
    if (!timeSlot) {
      throw new NotFoundException(`TimeSlot with ID ${id} not found`);
    }
    return timeSlot;
  }

  async create(timeSlotData: Partial<TimeSlot>): Promise<TimeSlot> {
    // Validate teacher exists - Using findOne with teacherId instead of findById
    const teacher = await this.teacherConferenceModel.findOne({ teacherId: timeSlotData.teacherId }).exec();
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${timeSlotData.teacherId} not found`);
    }

    // Validate time slot
    if (new Date(timeSlotData.startTime) >= new Date(timeSlotData.endTime)) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for overlapping time slots
    const overlappingSlots = await this.timeSlotModel.find({
      teacherId: timeSlotData.teacherId,
      date: new Date(timeSlotData.date).toISOString().split('T')[0],
      $or: [
        {
          startTime: { $lt: timeSlotData.endTime },
          endTime: { $gt: timeSlotData.startTime },
        },
      ],
    }).exec();

    if (overlappingSlots.length > 0) {
      throw new BadRequestException('Time slot overlaps with existing time slots');
    }

    const newTimeSlot = new this.timeSlotModel(timeSlotData);
    return newTimeSlot.save();
  }

  async delete(id: string, userId?: string): Promise<void> {
    const timeSlot = await this.findById(id);
    
    // Only allow deletion if the slot is not booked
    if (timeSlot.isBooked) {
      throw new BadRequestException('Cannot delete a booked time slot');
    }

    // If userId is provided, check if the user is the teacher who owns this time slot
    if (userId) {
      const teacher = await this.teacherConferenceModel.findOne({ 
        teacherId: timeSlot.teacherId,
        userId: userId 
      }).exec();

      if (!teacher) {
        throw new ForbiddenException('You can only delete your own time slots');
      }
    }

    const result = await this.timeSlotModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`TimeSlot with ID ${id} not found`);
    }
  }

  async bookTimeSlot(id: string, studentId: string): Promise<TimeSlotDocument> {
    const timeSlot = await this.findById(id);
    
    if (timeSlot.isBooked) {
      throw new BadRequestException('This time slot is already booked');
    }

    // Öğrenci adını auth servisinden al
    let studentName = 'Bilinmeyen Öğrenci';
    try {
      const authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001/api';
      const response = await axios.get(`${authServiceUrl}/auth/user/${studentId}`);
      if (response.data) {
        // firstName ve lastName varsa kullan, yoksa username'i kontrol et
        if (response.data.firstName && response.data.lastName) {
          studentName = `${response.data.firstName} ${response.data.lastName}`;
        } else if (response.data.username) {
          studentName = response.data.username;
        }
      }
    } catch (error) {
      console.error('Öğrenci bilgileri alınamadı:', error);
      // Hata durumunda varsayılan isim kullanılacak
    }

    timeSlot.isBooked = true;
    timeSlot.studentId = studentId;
    timeSlot.studentName = studentName;
    
    // Aynı zamanda bir rezervasyon oluştur
    const newReservation = new this.reservationModel({
      teacherId: timeSlot.teacherId,
      studentId,
      studentName,
      timeSlotId: id,
      date: timeSlot.date,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      status: ReservationStatus.SCHEDULED,
    });
    
    await newReservation.save();
    
    return timeSlot.save();
  }

  async cancelBooking(id: string, studentId: string): Promise<TimeSlotDocument> {
    const timeSlot = await this.findById(id);
    
    if (!timeSlot.isBooked) {
      throw new BadRequestException('This time slot is not booked');
    }

    if (timeSlot.studentId !== studentId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    timeSlot.isBooked = false;
    timeSlot.studentId = null;
    timeSlot.studentName = null;
    
    // İlgili rezervasyonu da iptal et
    await this.reservationModel.findOneAndUpdate(
      { timeSlotId: id, studentId },
      { status: ReservationStatus.CANCELLED },
      { new: true }
    );
    
    return timeSlot.save();
  }

  async findStudentBookings(studentId: string): Promise<TimeSlot[]> {
    return this.timeSlotModel.find({ 
      studentId,
      isBooked: true 
    })
    .sort({ date: 1, startTime: 1 })
    .exec();
  }
}
