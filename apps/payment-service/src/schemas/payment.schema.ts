import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentType {
  VIDEO_CONFERENCE = 'video_conference',
  RESERVATION = 'reservation',
}

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  teacherId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ required: true, enum: PaymentType })
  type: PaymentType;

  @Prop()
  reservationId?: string;

  @Prop()
  stripePaymentIntentId?: string;

  @Prop()
  stripeClientSecret?: string;

  @Prop()
  stripeCustomerId?: string;

  @Prop()
  stripePaymentMethodId?: string;

  @Prop()
  stripeChargeId?: string;

  @Prop()
  receiptUrl?: string;

  @Prop()
  failureMessage?: string;

  @Prop()
  refundedAmount?: number;

  @Prop()
  description?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
