
import { prisma } from "../lib/prisma.js";
import { candidateProfilePublicSelect } from "../lib/selects.js";

type CandidateProfileData = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string | null;
  headline?: string | null;
  summary?: string | null;
  skills?: string[];
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
};

type CreateCandidateProfileData = CandidateProfileData & {
  firstName: string;
  lastName: string;
  phone: string;
};

export async function getCandidateProfile(userId: string) {
  return prisma.candidateProfile.findUnique({
    where: { userId },
    select: candidateProfilePublicSelect,
  });
}

export async function createCandidateProfile(
  userId: string,
  data: CreateCandidateProfileData,
) {
  return prisma.candidateProfile.create({
    data: {
      userId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      location: data.location,
      headline: data.headline,
      summary: data.summary,
      skills: data.skills ?? [],
      linkedinUrl: data.linkedinUrl,
      portfolioUrl: data.portfolioUrl,
    },
    select: candidateProfilePublicSelect,
  });
}

export async function updateCandidateProfile(
  userId: string,
  data: CandidateProfileData,
) {
  return prisma.candidateProfile.update({
    where: { userId },
    data,
    select: candidateProfilePublicSelect,
  });
}
