import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
