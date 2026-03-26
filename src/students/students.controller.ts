import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { StudentsService } from './students.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar estudiantes (paginado, con filtros)' })
  @ApiQuery({ name: 'status', required: false, enum: ['activo', 'inactivo', 'completado', 'abandonado'], description: 'Filtrar por estado' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre, email, institución o curso' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
  @ApiOperation({ summary: 'Detalle de estudiante' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear estudiante (admin puede asignar instructorId)' })
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: AuthUser) {
    return this.studentsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar estudiante' })
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: AuthUser) {
    return this.studentsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar estudiante' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentsService.remove(id, user);
  }
}
