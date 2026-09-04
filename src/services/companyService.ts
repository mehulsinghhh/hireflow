import { prisma } from "../lib/prisma.js";

export async function createCompany(
  name: string,
  description?: string
) {
  return prisma.company.create({
    data: {
      name,
      description,
    },
  });
}

export async function getCompanies() {
  return prisma.company.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCompanyById(id: string) {
  return prisma.company.findUnique({
    where: { id },
  });
}

export async function updateCompany(
  id: string,
  name?: string,
  description?: string
) {
  return prisma.company.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
  });
}

export async function deleteCompany(id: string) {
  return prisma.company.delete({
    where: { id },
  });
}