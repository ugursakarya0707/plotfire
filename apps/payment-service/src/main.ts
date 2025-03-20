import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Webhook için raw body gerekiyor
  });
  const configService = app.get(ConfigService);
  
  // Raw body parsing middleware
  app.use((req, res, next) => {
    if (req.originalUrl.includes('/webhooks')) {
      let data = '';
      req.setEncoding('utf8');
      
      req.on('data', (chunk) => {
        data += chunk;
      });
      
      req.on('end', () => {
        req.rawBody = Buffer.from(data);
        next();
      });
    } else {
      next();
    }
  });
  
  // JSON parsing middleware (for non-webhook routes)
  app.use((req, res, next) => {
    if (!req.originalUrl.includes('/webhooks')) {
      express.json()(req, res, next);
    } else {
      next();
    }
  });
  
  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  const port = configService.get<number>('PORT') || 3007;
  await app.listen(port);
  console.log(`Payment Service is running on port ${port}`);
}

bootstrap();
