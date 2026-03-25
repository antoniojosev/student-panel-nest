import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
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
