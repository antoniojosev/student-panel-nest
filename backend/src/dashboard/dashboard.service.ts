import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface AuthUser {
  id: string;
  role: string;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(user: AuthUser) {
    const where = user.role === 'instructor' ? { instructorId: user.id } : {};

    const [
      totalStudents,
      statusDistribution,
      avgProgress,
      last7Days,
      instructorRanking,
    ] = await Promise.all([
      this.prisma.student.count({ where }),
      this.getStatusDistribution(where),
      this.getAverageProgress(where),
      this.getLast7DaysRegistrations(where),
      this.getInstructorRanking(user),
    ]);

    return {
      totalStudents,
      statusDistribution,
      avgProgress,
      last7Days,
      instructorRanking,
    };
  }

  private async getStatusDistribution(where: Record<string, unknown>) {
    const students = await this.prisma.student.groupBy({
      by: ['status'],
      _count: { status: true },
      where,
    });
    return students.map((s) => ({ status: s.status, count: s._count.status }));
  }

  private async getAverageProgress(where: Record<string, unknown>) {
    const result = await this.prisma.student.aggregate({
      _avg: { progress: true },
      where,
    });
    return Math.round(result._avg.progress ?? 0);
  }

  private async getLast7DaysRegistrations(where: Record<string, unknown>) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const students = await this.prisma.student.findMany({
      where: { ...where, registeredAt: { gte: sevenDaysAgo } },
      select: { registeredAt: true },
      orderBy: { registeredAt: 'asc' },
    });

    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }

    for (const s of students) {
      const key = s.registeredAt.toISOString().split('T')[0];
      if (key in days) days[key]++;
    }

    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }

  private async getInstructorRanking(user: AuthUser) {
    if (user.role === 'instructor') return [];

    const ranking = await this.prisma.student.groupBy({
      by: ['instructorId'],
      where: { status: 'completado' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const instructorIds = ranking.map((r) => r.instructorId);
    const instructors = await this.prisma.user.findMany({
      where: { id: { in: instructorIds } },
      select: { id: true, name: true, email: true },
    });

    const instructorMap = new Map(instructors.map((i) => [i.id, i]));

    return ranking.map((r) => ({
      instructor: instructorMap.get(r.instructorId),
      completedStudents: r._count.id,
    }));
  }
}
