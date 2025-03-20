import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentStatus, PaymentType, PaymentDocument } from '../schemas/payment.schema';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private stripeService: StripeService,
  ) {}

  async createPayment(userId: string, createPaymentDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    try {
      this.logger.log(`Creating payment for user ${userId} to teacher ${createPaymentDto.teacherId}`);
      
      // Stripe ile ödeme niyeti oluştur
      const { paymentIntentId, clientSecret } = await this.stripeService.createPaymentIntent(
        createPaymentDto.amount,
        createPaymentDto.currency,
        undefined, // Customer ID, ilk etapta boş bırakıyoruz
        {
          userId,
          teacherId: createPaymentDto.teacherId,
          type: createPaymentDto.type,
          ...(createPaymentDto.reservationId && { reservationId: createPaymentDto.reservationId }),
        },
      );

      // Ödeme kaydını oluştur
      const payment = new this.paymentModel({
        userId,
        teacherId: createPaymentDto.teacherId,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        status: PaymentStatus.PENDING,
        type: createPaymentDto.type,
        reservationId: createPaymentDto.reservationId,
        stripePaymentIntentId: paymentIntentId,
        description: createPaymentDto.description || `Payment for ${createPaymentDto.type}`,
      });

      const savedPayment = await payment.save();
      
      this.logger.log(`Payment created with ID: ${savedPayment._id}`);
      
      // Yanıt DTO'sunu oluştur
      return {
        id: savedPayment._id,
        userId: savedPayment.userId,
        teacherId: savedPayment.teacherId,
        amount: savedPayment.amount,
        currency: savedPayment.currency,
        status: savedPayment.status,
        type: savedPayment.type,
        reservationId: savedPayment.reservationId,
        stripePaymentIntentId: savedPayment.stripePaymentIntentId,
        clientSecret, // Frontend'in ödeme işlemini tamamlaması için gerekli
        description: savedPayment.description,
        createdAt: savedPayment.createdAt,
        updatedAt: savedPayment.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error creating payment: ${error.message}`);
      throw new BadRequestException(`Failed to create payment: ${error.message}`);
    }
  }

  async getPaymentById(id: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentModel.findById(id);
    
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    
    return {
      id: payment._id,
      userId: payment.userId,
      teacherId: payment.teacherId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      type: payment.type,
      reservationId: payment.reservationId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      description: payment.description,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  async getUserPayments(userId: string): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentModel.find({ userId }).sort({ createdAt: -1 });
    
    return payments.map(payment => ({
      id: payment._id,
      userId: payment.userId,
      teacherId: payment.teacherId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      type: payment.type,
      reservationId: payment.reservationId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      description: payment.description,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));
  }

  async updatePaymentStatus(
    stripePaymentIntentId: string, 
    status: PaymentStatus,
    additionalData: Record<string, any> = {}
  ): Promise<PaymentResponseDto> {
    try {
      this.logger.log(`Updating payment status for payment intent ${stripePaymentIntentId} to ${status}`);
      
      const payment = await this.paymentModel.findOne({ 
        stripePaymentIntentId 
      }).exec();
      
      if (!payment) {
        this.logger.warn(`Payment with payment intent ID ${stripePaymentIntentId} not found`);
        throw new NotFoundException(`Payment with payment intent ID ${stripePaymentIntentId} not found`);
      }
      
      // Ödeme durumunu ve ek verileri güncelle
      payment.status = status;
      
      // Ek verileri ödeme belgesine ekle
      Object.keys(additionalData).forEach(key => {
        payment[key] = additionalData[key];
      });
      
      const updatedPayment = await payment.save();
      this.logger.log(`Payment status updated to ${status} for payment ${payment._id}`);
      
      return {
        id: updatedPayment._id,
        userId: updatedPayment.userId,
        teacherId: updatedPayment.teacherId,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        status: updatedPayment.status,
        type: updatedPayment.type,
        reservationId: updatedPayment.reservationId,
        stripePaymentIntentId: updatedPayment.stripePaymentIntentId,
        description: updatedPayment.description,
        createdAt: updatedPayment.createdAt,
        updatedAt: updatedPayment.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error updating payment status: ${error.message}`);
      throw error;
    }
  }

  async handleWebhookEvent(event: any): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
    await this.updatePaymentStatus(paymentIntent.id, PaymentStatus.COMPLETED);
    this.logger.log(`Payment ${paymentIntent.id} marked as completed`);
  }

  private async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
    await this.updatePaymentStatus(paymentIntent.id, PaymentStatus.FAILED);
    this.logger.log(`Payment ${paymentIntent.id} marked as failed`);
  }
}
