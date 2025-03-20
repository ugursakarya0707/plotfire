import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReservationDocument = Reservation & Document;

export enum ReservationStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Reservation {
  @Prop({ required: true, type: String })
  teacherId: string;

  @Prop({ required: true, type: String })
  studentId: string;

  @Prop({ required: true, type: String })
  studentName: string;

  @Prop({ required: true, type: String })
  timeSlotId: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ 
    type: String, 
    enum: ReservationStatus, 
    default: ReservationStatus.SCHEDULED 
  })
  status: ReservationStatus;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
