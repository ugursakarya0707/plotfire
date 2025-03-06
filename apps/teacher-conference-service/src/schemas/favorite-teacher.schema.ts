import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';
import { TeacherConference } from './teacher-conference.schema';

export type FavoriteTeacherDocument = FavoriteTeacher & Document;

@Schema({ timestamps: true })
export class FavoriteTeacher {
  @Prop({ required: true })
  studentId: string;

  @Prop({ 
    required: true, 
    type: mongoose.Schema.Types.ObjectId, 
    ref: TeacherConference.name 
  })
  teacherId: Types.ObjectId | TeacherConference;

  @Prop({ default: true })
  isActive: boolean;
}

export const FavoriteTeacherSchema = SchemaFactory.createForClass(FavoriteTeacher);

// Oluşturulan şemaya indeks ekleyelim
FavoriteTeacherSchema.index({ studentId: 1, teacherId: 1 }, { unique: true });
