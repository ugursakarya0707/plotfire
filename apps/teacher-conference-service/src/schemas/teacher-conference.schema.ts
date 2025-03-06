import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeacherConferenceDocument = TeacherConference & Document;

@Schema({ timestamps: true })
export class TeacherConference {
  @Prop({ required: true, unique: true })
  teacherId: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ type: [String], default: [] })
  hobbies: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const TeacherConferenceSchema = SchemaFactory.createForClass(TeacherConference);

// Öğretmen ID'si için indeks oluşturalım
TeacherConferenceSchema.index({ teacherId: 1 }, { unique: true });

// Tam metin araması için indeks oluşturalım
TeacherConferenceSchema.index({ firstName: 'text', lastName: 'text' });
