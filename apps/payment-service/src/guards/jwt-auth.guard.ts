import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('Endpoint is marked as public, skipping authentication');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.error('No token found in request headers');
      throw new UnauthorizedException('Authentication token not provided');
    }

    try {
      this.logger.debug(`Verifying token: ${token.substring(0, 15)}...`);
      
      // JWT Secret'i configService'ten al, yoksa fallback değeri kullan
      const secret = this.configService.get<string>('JWT_SECRET') || 'postply-secret-key';
      this.logger.debug(`Using JWT secret: ${secret.substring(0, 5)}...`);
      
      const payload = this.jwtService.verify(token, { secret });
      this.logger.debug(`Token verified successfully for user: ${payload.id || payload.sub}`);
      
      // Kullanıcı bilgilerini request nesnesine ekle
      request.user = payload;
      
      return true;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    this.logger.debug(`Authorization header: ${authHeader ? authHeader.substring(0, 15) + '...' : 'not found'}`);
    
    if (!authHeader) {
      return undefined;
    }
    
    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer') {
      this.logger.warn(`Invalid authorization type: ${type}, expected 'Bearer'`);
      return undefined;
    }
    
    return token;
  }
}
