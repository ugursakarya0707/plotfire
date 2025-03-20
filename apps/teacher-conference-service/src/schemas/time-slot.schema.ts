import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TimeSlotDocument = TimeSlot & Document;

@Schema({ timestamps: true })
export class TimeSlot {
  @Prop({ required: true, type: String })
  teacherId: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ default: false })
  isBooked: boolean;

  @Prop({ type: String, default: null })
  studentId: string;

  @Prop({ type: String, default: null })
  studentName: string;
}

export const TimeSlotSchema = SchemaFactory.createForClass(TimeSlot);
