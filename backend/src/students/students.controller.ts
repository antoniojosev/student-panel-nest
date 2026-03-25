import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { StudentsService } from './students.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Controller('students')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.studentsService.findAll(user, { status, search, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentsService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: AuthUser) {
    return this.studentsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: AuthUser) {
    return this.studentsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentsService.remove(id, user);
  }
}
