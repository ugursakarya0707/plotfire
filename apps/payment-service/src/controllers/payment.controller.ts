import { Controller, Post, Get, Body, Param, Request, Logger, BadRequestException, UnauthorizedException, NotFoundException, HttpCode, RawBodyRequest, Req } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { PaymentStatus, PaymentType } from '../schemas/payment.schema';
import { Public } from '../decorators/public.decorator';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req,
  ): Promise<PaymentResponseDto> {
    try {
      this.logger.log(`Creating payment for user ${req.user.id}`);
      
      // Token'dan gelen kullanıcı ID'sini al (farklı formatlarda olabilir)
      const userId = req.user.id || req.user.userId || req.user.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }
      
      return await this.paymentService.createPayment(userId, createPaymentDto);
    } catch (error) {
      this.logger.error(`Error creating payment: ${error.message}`);
      throw error;
    }
  }

  @Get('me')
  async getUserPayments(@Request() req): Promise<PaymentResponseDto[]> {
    try {
      // Token'dan gelen kullanıcı ID'sini al (farklı formatlarda olabilir)
      const userId = req.user.id || req.user.userId || req.user.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }
      
      return await this.paymentService.getUserPayments(userId);
    } catch (error) {
      this.logger.error(`Error getting user payments: ${error.message}`);
      throw error;
    }
  }

  @Get(':id')
  async getPaymentById(@Param('id') id: string, @Request() req): Promise<PaymentResponseDto> {
    try {
      const payment = await this.paymentService.getPaymentById(id);
      
      // Token'dan gelen kullanıcı ID'sini al (farklı formatlarda olabilir)
      const userId = req.user.id || req.user.userId || req.user.sub;
      
      // Sadece kendi ödemelerini görebilir
      if (payment.userId !== userId) {
        throw new UnauthorizedException('You can only view your own payments');
      }
      
      return payment;
    } catch (error) {
      this.logger.error(`Error getting payment by ID: ${error.message}`);
      throw error;
    }
  }

  @Post('video-conference')
  async createVideoConferencePayment(
    @Body('teacherId') teacherId: string,
    @Body('amount') amount: number,
    @Request() req,
  ): Promise<PaymentResponseDto> {
    try {
      if (!teacherId) {
        throw new BadRequestException('Teacher ID is required');
      }
      
      if (!amount || amount <= 0) {
        throw new BadRequestException('Valid amount is required');
      }
      
      // Token'dan gelen kullanıcı ID'sini al (farklı formatlarda olabilir)
      const userId = req.user.id || req.user.userId || req.user.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }
      
      // Tutarı kuruş cinsine dönüştür (TL -> kuruş)
      // Frontend'den gelen tutar TL cinsinden, Stripe kuruş bekliyor
      const amountInCents = Math.round(amount * 100);
      
      const createPaymentDto: CreatePaymentDto = {
        teacherId,
        amount: amountInCents,
        currency: 'try',
        type: PaymentType.VIDEO_CONFERENCE,
        description: 'Video conference payment',
      };
      
      return await this.paymentService.createPayment(userId, createPaymentDto);
    } catch (error) {
      this.logger.error(`Error creating video conference payment: ${error.message}`);
      throw error;
    }
  }

  @Post('reservation')
  async createReservationPayment(
    @Body('teacherId') teacherId: string,
    @Body('amount') amount: number,
    @Body('reservationId') reservationId: string,
    @Request() req,
  ): Promise<PaymentResponseDto> {
    try {
      if (!teacherId) {
        throw new BadRequestException('Teacher ID is required');
      }
      
      if (!amount || amount <= 0) {
        throw new BadRequestException('Valid amount is required');
      }
      
      if (!reservationId) {
        throw new BadRequestException('Reservation ID is required');
      }
      
      // Token'dan gelen kullanıcı ID'sini al (farklı formatlarda olabilir)
      const userId = req.user.id || req.user.userId || req.user.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }
      
      // Tutarı kuruş cinsine dönüştür (TL -> kuruş)
      // Frontend'den gelen tutar TL cinsinden, Stripe kuruş bekliyor
      const amountInCents = Math.round(amount * 100);
      
      const createPaymentDto: CreatePaymentDto = {
        teacherId,
        amount: amountInCents,
        currency: 'try',
        type: PaymentType.RESERVATION,
        reservationId,
        description: 'Reservation payment',
      };
      
      return await this.paymentService.createPayment(userId, createPaymentDto);
    } catch (error) {
      this.logger.error(`Error creating reservation payment: ${error.message}`);
      throw error;
    }
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async handleStripeWebhook(@Req() req: RawBodyRequest<Request>): Promise<{ received: boolean }> {
    try {
      const payload = req.body;
      const event = payload;
      
      await this.paymentService.handleWebhookEvent(event);
      
      return { received: true };
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`);
      throw error;
    }
  }
}
