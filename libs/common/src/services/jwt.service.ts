import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;

  constructor() {
    // In production, these should be loaded from environment variables
    this.JWT_SECRET = process.env.JWT_SECRET || 'postply-secret-key';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  }

  generateToken(payload: any): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  verifyToken(token: string): any {
    return jwt.verify(token, this.JWT_SECRET);
  }

  decodeToken(token: string): any {
    return jwt.decode(token);
  }
}
