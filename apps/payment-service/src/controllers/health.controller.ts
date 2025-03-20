import { Controller, Get } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'payment-service',
    };
  }
}
