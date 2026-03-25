import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  getMetrics(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getMetrics(user);
  }
}
