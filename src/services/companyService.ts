import { prisma } from "../lib/prisma.js";
import { companyPublicSelect } from "../lib/selects.js";

export async function createCompany(
  name: string,
  description?: string
) {
  return prisma.company.create({
    data: {
      name,
      description,
    },
    select: companyPublicSelect,
  });
}

export async function getCompanies() {
  return prisma.company.findMany({
    select: companyPublicSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCompanyById(id: string) {
  return prisma.company.findUnique({
    where: {
      id,
    },
    select: companyPublicSelect,
  });
}

export async function updateCompany(
  id: string,
  name?: string,
  description?: string
) {
  return prisma.company.update({
    where: {
      id,
    },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined
        ? { description }
        : {}),
    },
    select: companyPublicSelect,
  });
}

export async function deleteCompany(id: string) {
  await prisma.company.delete({
    where: {
      id,
    },
  });
}