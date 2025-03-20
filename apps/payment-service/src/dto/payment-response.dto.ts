import { PaymentStatus, PaymentType } from '../schemas/payment.schema';

export class PaymentResponseDto {
  id: string;
  userId: string;
  teacherId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: PaymentType;
  reservationId?: string;
  stripePaymentIntentId?: string;
  clientSecret?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
