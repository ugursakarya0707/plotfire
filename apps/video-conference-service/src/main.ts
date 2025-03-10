import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });
  const configService = app.get(ConfigService);
  
  // Global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Global validation pipe with detailed error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      enableDebugMessages: true,
      disableErrorMessages: false,
      validationError: {
        target: true,
        value: true,
      },
    }),
  );
  
  const port = configService.get<number>('PORT', 3008);
  await app.listen(port);
  console.log(`Video Conference Service is running on port ${port}`);
}

bootstrap();
