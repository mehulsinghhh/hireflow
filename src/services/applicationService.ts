import { prisma } from "../lib/prisma.js";
import { applicationPublicSelect } from "../lib/selects.js";
import { enqueueApplicationCreated , enqueueApplicationStatusChanged, } from "../queues/applicationQueue.js";

type UserRole = "CANDIDATE" | "RECRUITER" | "ADMIN";

type ApplicationStatus =
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "REJECTED"
  | "HIRED";

  type ApplicationStatusChange = Exclude<
  ApplicationStatus,
  "APPLIED"
>;

  export async function createApplication(
  candidateId: string,
  jobId: string
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

  const existingApplication =
    await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId,
          jobId,
        },
      },
      select: {
        id: true,
      },
    });

  if (existingApplication) {
    throw new Error("APPLICATION_ALREADY_EXISTS");
  }

  const application = await prisma.application.create({
    data: {
      candidateId,
      jobId,
    },
    select: applicationPublicSelect,
  });

  try {
  await enqueueApplicationCreated(application.id);
} catch (error) {
  console.error(
    "Failed to enqueue application-created event:",
    error
  );
}

  return application;
}

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
  newStatus: ApplicationStatusChange,
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

  const updatedApplication =
    await prisma.application.update({
      where: {
        id: applicationId,
      },
      data: {
        status: newStatus,
      },
      select: applicationPublicSelect,
    });

  try {
    await enqueueApplicationStatusChanged(
      applicationId,
      newStatus
    );
  } catch (error) {
    console.error(
      "Failed to enqueue application-status-changed event:",
      error
    );
  }

  return updatedApplication;
}

export async function getApplicationsForRecruiter(
  recruiterId: string
) {
  return prisma.application.findMany({
    where: {
      job: {
        recruiterId,
      },
    },
    select: applicationPublicSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
}