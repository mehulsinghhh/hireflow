import { Prisma } from "../generated/prisma/client.js";

export const userPublicSelect = {
  id: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

export const companyPublicSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CompanySelect;

export const jobPublicSelect = {
  id: true,
  title: true,
  description: true,
  location: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: companyPublicSelect,
  },
} satisfies Prisma.JobSelect;

export const applicationPublicSelect = {
  id: true,
  candidateId: true,
  jobId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  candidate: {
    select: userPublicSelect,
  },
  job: {
    select: jobPublicSelect,
  },
} satisfies Prisma.ApplicationSelect;