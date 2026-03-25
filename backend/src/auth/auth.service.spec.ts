import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwt = { sign: jest.fn().mockReturnValue('mock-token') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    const dto = { email: 'new@mail.com', password: '123456', name: 'New Instructor' };

    it('should register as instructor and return token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: '1', email: dto.email, name: dto.name, role: 'instructor' });

      const result = await service.register(dto);

      expect(result.user.role).toBe('instructor');
      expect(result.access_token).toBe('mock-token');
      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.role).toBe('instructor');
      expect(createCall.data.password).not.toBe(dto.password);
    });

    it('should throw ConflictException on duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: dto.email });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const dto = { email: 'test@mail.com', password: '123456' };
    const hashedPassword = bcrypt.hashSync('123456', 10);

    it('should return user and token on valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1', email: dto.email, name: 'Test', role: 'instructor', password: hashedPassword,
      });

      const result = await service.login(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.access_token).toBe('mock-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1', email: dto.email, password: bcrypt.hashSync('wrong', 10),
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
