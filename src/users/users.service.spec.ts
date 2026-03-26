import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock; aggregate: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _count: { id: 1 } }),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      const users = [
        { id: '1', email: 'a@mail.com', name: 'A', role: 'admin' as const, createdAt: new Date(), updatedAt: new Date() },
      ];
      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result.data).toEqual(users);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.meta).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const user = { id: '1', email: 'a@mail.com', name: 'A', role: 'admin' as const };
      prisma.user.findUnique.mockResolvedValue(user);

      expect(await service.findOne('1')).toEqual(user);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { email: 'new@mail.com', password: '123456', name: 'New', role: 'instructor' as const };

    it('should create user with hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: '2', email: dto.email, name: dto.name, role: dto.role });

      const result = await service.create(dto);

      expect(result.email).toBe(dto.email);
      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe(dto.password);
    });

    it('should throw ConflictException on duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@mail.com', name: 'A', role: 'admin' as const });
      prisma.user.update.mockResolvedValue({ id: '1', email: 'a@mail.com', name: 'Updated', role: 'admin' as const });

      const result = await service.update('1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should hash password if provided', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@mail.com', name: 'A', role: 'admin' as const });
      prisma.user.update.mockResolvedValue({ id: '1' });

      await service.update('1', { password: 'newpass' });

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.password).not.toBe('newpass');
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@mail.com', name: 'A', role: 'admin' as const });
      prisma.user.delete.mockResolvedValue({});

      const result = await service.remove('1');

      expect(result.message).toBe('User deleted');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
