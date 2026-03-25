import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db' });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
