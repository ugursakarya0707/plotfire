import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VideoSessionDocument = VideoSession & Document;

@Schema({ timestamps: true })
export class VideoSession {
  @Prop({ required: true })
  teacherId: string;

  @Prop({ required: true })
  studentId: string;

  @Prop({ required: true })
  roomName: string;

  @Prop()
  roomToken: string;

  @Prop({ default: 'waiting' }) // waiting, active, completed, cancelled
  status: string;

  @Prop({ type: Date })
  startTime: Date;

  @Prop({ type: Date })
  endTime: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const VideoSessionSchema = SchemaFactory.createForClass(VideoSession);

// Öğretmen ID'si için indeks oluşturalım
VideoSessionSchema.index({ teacherId: 1 });

// Öğrenci ID'si için indeks oluşturalım
VideoSessionSchema.index({ studentId: 1 });

// Durum için indeks oluşturalım
VideoSessionSchema.index({ status: 1 });

// Oda adı için indeks oluşturalım
VideoSessionSchema.index({ roomName: 1 }, { unique: true });
