import { Controller, Post, Body, Headers, Logger, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from '../services/stripe.service';
import { PaymentService } from '../services/payment.service';
import { Public } from '../decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '../schemas/payment.schema';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('stripe')
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      this.logger.error('Webhook Error: No Stripe signature included');
      return { received: false, error: 'No Stripe signature included' };
    }

    try {
      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        this.logger.error('Webhook Error: Stripe webhook secret not configured');
        return { received: false, error: 'Stripe webhook secret not configured' };
      }

      // Express ham gövdeyi request.rawBody'de saklar
      const rawBody = request.rawBody || '';
      
      if (!rawBody) {
        this.logger.error('Webhook Error: No raw body available');
        return { received: false, error: 'No raw body available' };
      }

      // Webhook olayını doğrula
      const event = this.stripeService.constructWebhookEvent(
        rawBody.toString(),
        signature,
        webhookSecret,
      );

      this.logger.log(`Webhook received: ${event.type}`);

      // Olay tipine göre işlem yap
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object);
          break;
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (err) {
      this.logger.error(`Webhook Error: ${err.message}`);
      return { received: false, error: err.message };
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: any) {
    this.logger.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
    
    try {
      // Ödeme durumunu güncelle
      await this.paymentService.updatePaymentStatus(
        paymentIntent.id, 
        PaymentStatus.COMPLETED,
        {
          stripePaymentIntentId: paymentIntent.id,
          stripePaymentMethodId: paymentIntent.payment_method,
          stripeCustomerId: paymentIntent.customer,
          receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
        }
      );
      
      this.logger.log(`Payment status updated to succeeded for ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error updating payment status: ${error.message}`);
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: any) {
    this.logger.log(`PaymentIntent failed: ${paymentIntent.id}`);
    
    try {
      // Ödeme durumunu güncelle
      await this.paymentService.updatePaymentStatus(
        paymentIntent.id, 
        PaymentStatus.FAILED,
        {
          stripePaymentIntentId: paymentIntent.id,
          failureMessage: paymentIntent.last_payment_error?.message,
        }
      );
      
      this.logger.log(`Payment status updated to failed for ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error updating payment status: ${error.message}`);
    }
  }

  private async handleChargeRefunded(charge: any) {
    this.logger.log(`Charge refunded: ${charge.id}`);
    
    try {
      // Ödeme durumunu güncelle
      await this.paymentService.updatePaymentStatus(
        charge.payment_intent, 
        PaymentStatus.REFUNDED,
        {
          stripeChargeId: charge.id,
          refundedAmount: charge.amount_refunded,
        }
      );
      
      this.logger.log(`Payment status updated to refunded for ${charge.payment_intent}`);
    } catch (error) {
      this.logger.error(`Error updating payment status: ${error.message}`);
    }
  }
}
