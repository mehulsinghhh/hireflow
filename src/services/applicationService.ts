import { prisma } from "../lib/prisma.js";

export async function getApplicationsForJob(jobId: string) {
  const job = await prisma.job.findUnique({
    where: {
      id: jobId,
    },
  });

  if (!job) {
    throw new Error("JOB_NOT_FOUND");
  }

  return prisma.application.findMany({
    where: {
      jobId,
    },
    include: {
      candidate: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
      job: {
        include: {
          company: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}