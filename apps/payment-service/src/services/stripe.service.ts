import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY is not set. Stripe integration will not work properly.');
    }
    
    this.stripe = new Stripe(stripeSecretKey || 'dummy_key_for_development', {
      apiVersion: '2022-11-15',
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId?: string,
    metadata?: Record<string, string>,
  ): Promise<{ paymentIntentId: string; clientSecret: string }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount), 
        currency: currency.toLowerCase(),
        customer: customerId,
        metadata,
        payment_method_types: ['card'],
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      this.logger.error(`Error creating payment intent: ${error.message}`);
      throw error;
    }
  }

  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      });

      return customer.id;
    } catch (error) {
      this.logger.error(`Error creating customer: ${error.message}`);
      throw error;
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(`Error retrieving payment intent: ${error.message}`);
      throw error;
    }
  }

  async createRefund(paymentIntentId: string): Promise<Stripe.Refund> {
    try {
      return await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
      });
    } catch (error) {
      this.logger.error(`Error creating refund: ${error.message}`);
      throw error;
    }
  }

  constructWebhookEvent(
    payload: string,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    try {
      this.logger.log('Constructing webhook event');
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw error;
    }
  }
}
