import { prisma } from "../lib/prisma.js";

export async function createJob(
  title: string,
  description: string,
  location: string,
  companyId: string
) {
  return prisma.job.create({
    data: {
      title,
      description,
      location,
      companyId,
    },
    include: {
      company: true,
    },
  });
}

export async function getJobs(options: {
  page: number;
  limit: number;
  location?: string;
  companyId?: string;
}) {
  const { page, limit, location, companyId } = options;

  const skip = (page - 1) * limit;

  const where = {
    ...(location
      ? {
          location: {
            contains: location,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(companyId ? { companyId } : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      include: {
        company: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.job.count({
      where,
    }),
  ]);

  return {
    jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getJobById(id: string) {
  return prisma.job.findUnique({
    where: { id },
    include: {
      company: true,
      applications: true,
    },
  });
}

export async function updateJob(
  id: string,
  title?: string,
  description?: string,
  location?: string
) {
  return prisma.job.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(location !== undefined ? { location } : {}),
    },
    include: {
      company: true,
    },
  });
}

export async function deleteJob(id: string) {
  return prisma.job.delete({
    where: { id },
  });
}