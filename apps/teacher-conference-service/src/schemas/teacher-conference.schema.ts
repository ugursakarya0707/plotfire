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
  
  @Prop({ type: String, default: null })
  subject: string;
  
  @Prop({ type: Number, default: 0 })
  hourlyRate: number;
  
  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  rating: number;
  
  @Prop({ type: Number, default: 0 })
  ratingCount: number;
  
  @Prop({ type: String, default: null })
  photoUrl: string;
  
  @Prop({ type: String, default: null })
  bio: string;
  
  @Prop({ type: Boolean, default: false })
  isOnline: boolean;
}

export const TeacherConferenceSchema = SchemaFactory.createForClass(TeacherConference);

// Öğretmen ID'si için indeks oluşturalım
TeacherConferenceSchema.index({ teacherId: 1 }, { unique: true });

// Tam metin araması için indeks oluşturalım
TeacherConferenceSchema.index({ firstName: 'text', lastName: 'text', subject: 'text', bio: 'text' });
