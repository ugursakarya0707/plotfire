import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();
    
    // 404 hataları için özel mesaj
    if (status === HttpStatus.NOT_FOUND) {
      const path = request.url;
      
      // Video konferans API'si ile ilgili 404 hataları için özel mesajlar
      if (path.includes('/api/livekit-proxy/')) {
        this.logger.warn(`LiveKit Proxy API endpoint not found: ${path}`);
        
        // Endpoint'e göre özel mesajlar
        if (path.includes('/notify-teacher')) {
          return response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: 'LiveKit Proxy notify-teacher endpoint not found. Please use /api/video-sessions/notify-teacher endpoint instead.',
            alternativeEndpoints: [
              '/api/video-sessions/notify-teacher',
              '/api/mcp/teachers/{teacherId}/pending-sessions'
            ]
          });
        }
        
        if (path.includes('/room/') && path.includes('/exists')) {
          return response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: 'Room existence check endpoint not found. Please check API documentation for available endpoints.',
            alternativeEndpoints: [
              '/api/livekit-proxy/participants/{roomId}'
            ]
          });
        }
        
        if (path.includes('/participants/')) {
          return response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: 'Participants endpoint not found. Please check API documentation for available endpoints.',
            alternativeEndpoints: [
              '/api/video-sessions/{sessionId}'
            ]
          });
        }
      }
      
      if (path.includes('/api/video-sessions/')) {
        this.logger.warn(`Video Sessions API endpoint not found: ${path}`);
        
        return response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: 'Video Sessions API endpoint not found. Please check API documentation for available endpoints.',
          apiDocumentation: '/api/video-conference/documentation'
        });
      }
    }
    
    // Diğer hatalar için standart yanıt
    const errorMessage = 
      typeof errorResponse === 'object' && errorResponse['message']
        ? errorResponse['message']
        : exception.message;
    
    this.logger.error(`${request.method} ${request.url} - ${status}: ${errorMessage}`);
    
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessage,
      error: exception.name
    });
  }
}
