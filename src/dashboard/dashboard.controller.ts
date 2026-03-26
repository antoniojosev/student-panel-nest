import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Métricas del dashboard (admin: global, instructor: propias)' })
  getMetrics(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getMetrics(user);
  }
}
