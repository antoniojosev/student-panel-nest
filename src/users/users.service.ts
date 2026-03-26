import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const USER_SELECT = { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { page?: number; limit?: number; excludeUserId?: string }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query?.excludeUserId) {
      where.id = { not: query.excludeUserId };
    }

    const [data, aggregate] = await Promise.all([
      this.prisma.user.findMany({
        select: USER_SELECT,
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.aggregate({ _count: { id: true }, where }),
    ]);
    const total = aggregate._count.id;

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

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { ...dto, password: hashed },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.user.delete({ where: { id } });
      return { message: 'User deleted' };
    } catch (error: unknown) {
      if (error instanceof Object && 'code' in error && error.code === 'P2003') {
        throw new BadRequestException('Cannot delete user with assigned students');
      }
      throw error;
    }
  }
}
