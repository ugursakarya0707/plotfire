import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus, Param, NotFoundException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { CreateUserDto, LoginDto, AuthResponse, UserDto } from '@postply/models';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<AuthResponse> {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Get('validate-token')
  async validateToken(@Body('token') token: string): Promise<{ valid: boolean }> {
    const valid = await this.authService.validateToken(token);
    return { valid };
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUser(@Req() req): Promise<UserDto> {
    return req.user;
  }

  @Public()
  @Get('user/:id')
  async getUserById(@Param('id') id: string): Promise<UserDto> {
    const user = await this.authService.getUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
}
