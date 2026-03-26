import { Injectable } from '@nestjs/common';
import { Role, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

interface AuthUser {
  id: string;
  role: Role;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(user: AuthUser) {
    const where = user.role === Role.instructor ? { instructorId: user.id } : {};

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
    return students.map((s) => ({ name: s.status, value: s._count.status }));
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

    return Object.entries(days).map(([date, count]) => ({ name: date, complete: count }));
  }

  private async getInstructorRanking(user: AuthUser) {
    if (user.role === Role.instructor) return [];

    const completed = await this.prisma.student.groupBy({
      by: ['instructorId'],
      where: { status: StudentStatus.completado },
      _count: { id: true },
    });

    const totals = await this.prisma.student.groupBy({
      by: ['instructorId'],
      _count: { id: true },
    });

    const completedMap = new Map(completed.map((r) => [r.instructorId, r._count.id]));
    const totalsMap = new Map(totals.map((r) => [r.instructorId, r._count.id]));
    const allInstructorIds = Array.from(new Set([
      ...completed.map((r) => r.instructorId),
      ...totals.map((r) => r.instructorId),
    ]));

    const instructors = await this.prisma.user.findMany({
      where: { id: { in: allInstructorIds } },
      select: { id: true, name: true, email: true },
    });
    const instructorMap = new Map(instructors.map((i) => [i.id, i]));

    const rows = allInstructorIds.map((id) => {
      const completedCount = completedMap.get(id) || 0;
      const totalCount = totalsMap.get(id) || 0;
      const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      return {
        instructor: instructorMap.get(id),
        completedStudents: completedCount,
        totalStudents: totalCount,
        completionRate: rate,
      };
    });

    rows.sort((a, b) => {
      if (b.completedStudents !== a.completedStudents) {
        return b.completedStudents - a.completedStudents;
      }
      return (a.instructor?.name || '').localeCompare(b.instructor?.name || '');
    });

    return rows.map(({ totalStudents: _, ...rest }, idx) => ({
      ranking: idx + 1,
      ...rest,
    }));
  }
}
