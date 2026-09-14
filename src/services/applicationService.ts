import { prisma } from "../lib/prisma.js";
import { applicationPublicSelect } from "../lib/selects.js";

type UserRole = "CANDIDATE" | "RECRUITER" | "ADMIN";

type ApplicationStatus =
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "REJECTED"
  | "HIRED";

export async function getApplicationsForJob(
  jobId: string,
  userId: string,
  role: UserRole
) {
  const job = await prisma.job.findUnique({
    where: {
      id: jobId,
    },
    select: {
      id: true,
      recruiterId: true,
    },
  });

  if (!job) {
    throw new Error("JOB_NOT_FOUND");
  }

  if (role !== "ADMIN" && job.recruiterId !== userId) {
    throw new Error("FORBIDDEN");
  }

  return prisma.application.findMany({
    where: {
      jobId,
    },
    select: applicationPublicSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  userId: string,
  role: UserRole
) {
  const application = await prisma.application.findUnique({
    where: {
      id: applicationId,
    },
    select: {
      id: true,
      status: true,
      job: {
        select: {
          recruiterId: true,
        },
      },
    },
  });

  if (!application) {
    throw new Error("APPLICATION_NOT_FOUND");
  }

  if (
    role !== "ADMIN" &&
    application.job.recruiterId !== userId
  ) {
    throw new Error("FORBIDDEN");
  }

  const allowedTransitions: Record<
    ApplicationStatus,
    ApplicationStatus[]
  > = {
    APPLIED: ["SCREENING", "REJECTED"],
    SCREENING: ["INTERVIEW", "REJECTED"],
    INTERVIEW: ["HIRED", "REJECTED"],
    REJECTED: [],
    HIRED: [],
  };

  const allowedNextStatuses =
    allowedTransitions[application.status];

  if (!allowedNextStatuses.includes(newStatus)) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }

  return prisma.application.update({
    where: {
      id: applicationId,
    },
    data: {
      status: newStatus,
    },
    select: applicationPublicSelect,
  });
}