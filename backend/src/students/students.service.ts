import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

interface AuthUser {
  id: string;
  role: string;
}

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: AuthUser, query?: { status?: string; search?: string; page?: number; limit?: number }) {
    const where: Record<string, unknown> = {};
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;

    if (user.role === 'instructor') {
      where.instructorId = user.id;
    }
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
        { institution: { contains: query.search } },
        { course: { contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: { instructor: { select: { id: true, name: true, email: true } } },
        orderBy: { registeredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: AuthUser) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { instructor: { select: { id: true, name: true, email: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (user.role === 'instructor' && student.instructorId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return student;
  }

  async create(dto: CreateStudentDto, user: AuthUser) {
    await this.checkEmailUnique(dto.email);

    let instructorId = user.id;
    if (user.role === 'admin' && dto.instructorId) {
      await this.validateInstructor(dto.instructorId);
      instructorId = dto.instructorId;
    }

    const { instructorId: _, ...data } = dto;
    return this.prisma.student.create({
      data: { ...data, instructorId },
      include: { instructor: { select: { id: true, name: true, email: true } } },
    });
  }

  async update(id: string, dto: UpdateStudentDto, user: AuthUser) {
    const student = await this.findOne(id, user);

    if (dto.email && dto.email !== student.email) {
      await this.checkEmailUnique(dto.email);
    }

    return this.prisma.student.update({
      where: { id },
      data: dto,
      include: { instructor: { select: { id: true, name: true, email: true } } },
    });
  }

  private async checkEmailUnique(email: string, excludeId?: string) {
    const existing = await this.prisma.student.findUnique({ where: { email } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Student email already registered');
    }
  }

  private async validateInstructor(instructorId: string) {
    const instructor = await this.prisma.user.findUnique({ where: { id: instructorId } });
    if (!instructor || instructor.role !== 'instructor') {
      throw new BadRequestException('Invalid instructor ID');
    }
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.student.delete({ where: { id } });
    return { message: 'Student deleted' };
  }
}
