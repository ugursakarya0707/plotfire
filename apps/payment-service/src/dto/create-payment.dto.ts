import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentType } from '../schemas/payment.schema';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  teacherId: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  currency: string = 'try'; // Default to Turkish Lira

  @IsNotEmpty()
  @IsEnum(PaymentType)
  type: PaymentType;

  @IsOptional()
  @IsString()
  reservationId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
