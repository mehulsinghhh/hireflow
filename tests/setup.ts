import { beforeEach, afterAll } from "vitest";

import { prisma } from "../src/lib/prisma.js";
import { connectRedis, redis } from "../src/lib/redis.js";

beforeEach(async () => {
  await connectRedis();

  await prisma.notification.deleteMany();
  await prisma.application.deleteMany();
  await prisma.job.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();

  if (redis.isOpen) {
    await redis.quit();
  }
});