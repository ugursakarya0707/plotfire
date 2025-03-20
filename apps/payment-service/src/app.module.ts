import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { StripeService } from './services/stripe.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HealthController } from './controllers/health.controller';
import { WebhookController } from './controllers/webhook.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/payment-service',
      }),
    }),
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'postply-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [PaymentController, HealthController, WebhookController],
  providers: [
    PaymentService, 
    StripeService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
