import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter, LoggingInterceptor } from '@postply/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // Enable CORS
  app.enableCors();
  
  // Global pipes, filters, and interceptors
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  // Start the server
  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  console.log(`Auth service is running on port ${port}`);
}

bootstrap();
