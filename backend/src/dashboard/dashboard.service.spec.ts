import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    student: { count: jest.Mock; groupBy: jest.Mock; aggregate: jest.Mock; findMany: jest.Mock };
    user: { findMany: jest.Mock };
  };

  const adminUser = { id: 'admin-1', role: 'admin' };
  const instructorUser = { id: 'inst-1', role: 'instructor' };

  beforeEach(async () => {
    prisma = {
      student: {
        count: jest.fn().mockResolvedValue(10),
        groupBy: jest.fn().mockResolvedValue([
          { status: 'activo', _count: { status: 4, id: 3 } },
          { status: 'completado', _count: { status: 3, id: 3 } },
          { status: 'inactivo', _count: { status: 2, id: 2 } },
          { status: 'abandonado', _count: { status: 1, id: 1 } },
        ]),
        aggregate: jest.fn().mockResolvedValue({ _avg: { progress: 65.5 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  describe('getMetrics', () => {
    it('should return all metrics for admin', async () => {
      const result = await service.getMetrics(adminUser);

      expect(result.totalStudents).toBe(10);
      expect(result.statusDistribution).toHaveLength(4);
      expect(result.avgProgress).toBe(66); // rounded from 65.5
      expect(result.last7Days).toHaveLength(7);
      expect(result.instructorRanking).toBeDefined();
    });

    it('should filter by instructorId for instructor', async () => {
      await service.getMetrics(instructorUser);

      const countCall = prisma.student.count.mock.calls[0][0];
      expect(countCall.where.instructorId).toBe('inst-1');
    });

    it('should not filter by instructorId for admin', async () => {
      await service.getMetrics(adminUser);

      const countCall = prisma.student.count.mock.calls[0][0];
      expect(countCall.where).not.toHaveProperty('instructorId');
    });

    it('should return empty instructor ranking for instructor role', async () => {
      const result = await service.getMetrics(instructorUser);

      expect(result.instructorRanking).toEqual([]);
    });

    it('should return 7 days in last7Days', async () => {
      const result = await service.getMetrics(adminUser);

      expect(result.last7Days).toHaveLength(7);
      result.last7Days.forEach((day: { date: string; count: number }) => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('count');
      });
    });

    it('should handle null average progress', async () => {
      prisma.student.aggregate.mockResolvedValue({ _avg: { progress: null } });

      const result = await service.getMetrics(adminUser);

      expect(result.avgProgress).toBe(0);
    });
  });
});
