import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: {
    student: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock; count: jest.Mock };
    user: { findUnique: jest.Mock };
  };

  const adminUser = { id: 'admin-1', role: 'admin' as const };
  const instructor1 = { id: 'inst-1', role: 'instructor' as const };
  const instructor2 = { id: 'inst-2', role: 'instructor' as const };

  const mockStudent = {
    id: 'stu-1', name: 'Student', email: 's@mail.com', institution: 'MIT',
    course: 'VR Basics', progress: 50, status: 'activo', instructorId: 'inst-1',
    instructor: { id: 'inst-1', name: 'Instructor', email: 'i@mail.com' },
  };

  beforeEach(async () => {
    prisma = {
      student: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StudentsService);
  });

  describe('findAll', () => {
    beforeEach(() => {
      prisma.student.count.mockResolvedValue(1);
    });

    it('should return paginated students for admin', async () => {
      prisma.student.findMany.mockResolvedValue([mockStudent]);

      const result = await service.findAll(adminUser);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      const call = prisma.student.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('instructorId');
    });

    it('should filter by instructorId for instructor', async () => {
      prisma.student.findMany.mockResolvedValue([mockStudent]);

      await service.findAll(instructor1);

      const call = prisma.student.findMany.mock.calls[0][0];
      expect(call.where.instructorId).toBe('inst-1');
    });

    it('should apply status filter', async () => {
      prisma.student.findMany.mockResolvedValue([]);

      await service.findAll(adminUser, { status: 'activo' });

      const call = prisma.student.findMany.mock.calls[0][0];
      expect(call.where.status).toBe('activo');
    });

    it('should apply search filter', async () => {
      prisma.student.findMany.mockResolvedValue([]);

      await service.findAll(adminUser, { search: 'MIT' });

      const call = prisma.student.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
    });

    it('should paginate with custom page and limit', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(25);

      const result = await service.findAll(adminUser, { page: 2, limit: 5 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(5);
      const call = prisma.student.findMany.mock.calls[0][0];
      expect(call.skip).toBe(5);
      expect(call.take).toBe(5);
    });
  });

  describe('findOne', () => {
    it('should return student for admin regardless of instructor', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);

      const result = await service.findOne('stu-1', adminUser);

      expect(result.id).toBe('stu-1');
    });

    it('should return student for owning instructor', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);

      const result = await service.findOne('stu-1', instructor1);

      expect(result.id).toBe('stu-1');
    });

    it('should throw ForbiddenException for non-owning instructor', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);

      await expect(service.findOne('stu-1', instructor2)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999', adminUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { name: 'New', email: 'new@mail.com', institution: 'MIT', course: 'VR' };

    beforeEach(() => {
      // email not taken
      prisma.student.findUnique.mockResolvedValue(null);
    });

    it('should create student assigned to the authenticated instructor', async () => {
      prisma.student.create.mockResolvedValue({ ...dto, id: 'stu-2', instructorId: 'inst-1' });

      const result = await service.create(dto, instructor1);

      expect(result.instructorId).toBe('inst-1');
      const call = prisma.student.create.mock.calls[0][0];
      expect(call.data.instructorId).toBe('inst-1');
    });

    it('should allow admin to assign student to a specific instructor', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'inst-1', role: 'instructor' as const });
      prisma.student.create.mockResolvedValue({ ...dto, id: 'stu-2', instructorId: 'inst-1' });

      const result = await service.create({ ...dto, instructorId: 'inst-1' }, adminUser);

      expect(result.instructorId).toBe('inst-1');
    });

    it('should throw BadRequestException if admin assigns to invalid instructor', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ ...dto, instructorId: 'bad-id' }, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on duplicate student email', async () => {
      prisma.student.findUnique.mockResolvedValue({ id: 'existing', email: dto.email });

      await expect(service.create(dto, instructor1)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update student for owning instructor', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.student.update.mockResolvedValue({ ...mockStudent, progress: 80 });

      const result = await service.update('stu-1', { progress: 80 }, instructor1);

      expect(result.progress).toBe(80);
    });

    it('should throw ForbiddenException for non-owning instructor', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);

      await expect(service.update('stu-1', { progress: 80 }, instructor2)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when updating to duplicate email', async () => {
      prisma.student.findUnique
        .mockResolvedValueOnce(mockStudent) // findOne call
        .mockResolvedValueOnce({ id: 'other', email: 'taken@mail.com' }); // checkEmailUnique

      await expect(
        service.update('stu-1', { email: 'taken@mail.com' }, instructor1),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same email', async () => {
      prisma.student.findUnique
        .mockResolvedValueOnce(mockStudent) // findOne
        .mockResolvedValueOnce(mockStudent); // checkEmailUnique - same student
      prisma.student.update.mockResolvedValue(mockStudent);

      // Should not throw - same email, same student
      await expect(
        service.update('stu-1', { email: 's@mail.com' }, instructor1),
      ).resolves.toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete student for owning instructor', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);
      prisma.student.delete.mockResolvedValue({});

      const result = await service.remove('stu-1', instructor1);

      expect(result.message).toBe('Student deleted');
    });

    it('should throw ForbiddenException for non-owning instructor', async () => {
      prisma.student.findUnique.mockResolvedValue(mockStudent);

      await expect(service.remove('stu-1', instructor2)).rejects.toThrow(ForbiddenException);
    });
  });
});
