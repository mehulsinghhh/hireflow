import { Worker } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { emitNotificationToUser } from "../realtime/socketServer.js";

const redisConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

type ApplicationCreatedPayload = {
  applicationId: string;
};

type ApplicationStatus =
  | "SCREENING"
  | "INTERVIEW"
  | "REJECTED"
  | "HIRED";

type ApplicationStatusChangedPayload = {
  applicationId: string;
  status: ApplicationStatus;
};

async function processApplicationCreated(
  data: ApplicationCreatedPayload
) {
  const application = await prisma.application.findUnique({
    where: {
      id: data.applicationId,
    },
    select: {
      id: true,
      job: {
        select: {
          title: true,
          recruiterId: true,
        },
      },
    },
  });

  if (!application) {
    console.warn(
      `Application ${data.applicationId} no longer exists`
    );

    return {
      processed: false,
      reason: "APPLICATION_NOT_FOUND",
    };
  }

  if (!application.job.recruiterId) {
    console.warn(
      `Application ${data.applicationId} has no recruiter recipient`
    );

    return {
      processed: false,
      reason: "NO_RECRUITER",
    };
  }

  const eventKey =
    `application-created-${application.id}`;

  let notification;

  try {
    notification = await prisma.notification.create({
      data: {
        recipientId: application.job.recruiterId,
        applicationId: application.id,
        type: "APPLICATION_CREATED",
        message:
          `New application received for ${application.job.title}`,
        eventKey,
      },
      select: {
        id: true,
        type: true,
        message: true,
        applicationId: true,
        readAt: true,
        createdAt: true,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return {
        processed: false,
        reason: "ALREADY_PROCESSED",
      };
    }

    throw error;
  }

  emitNotificationToUser(
    application.job.recruiterId,
    notification
  );

  return {
    processed: true,
    notificationId: notification.id,
  };
}

async function processApplicationStatusChanged(
  data: ApplicationStatusChangedPayload
) {
  const application = await prisma.application.findUnique({
    where: {
      id: data.applicationId,
    },
    select: {
      id: true,
      candidateId: true,
      job: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!application) {
    console.warn(
      `Application ${data.applicationId} no longer exists`
    );

    return {
      processed: false,
      reason: "APPLICATION_NOT_FOUND",
    };
  }

  const eventKey =
    `application-status-changed-${application.id}-${data.status}`;

  let notification;

  try {
    notification = await prisma.notification.create({
      data: {
        recipientId: application.candidateId,
        applicationId: application.id,
        type: "APPLICATION_STATUS_CHANGED",
        message:
          `Your application for ${application.job.title} moved to ${data.status}`,
        eventKey,
      },
      select: {
        id: true,
        type: true,
        message: true,
        applicationId: true,
        readAt: true,
        createdAt: true,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return {
        processed: false,
        reason: "ALREADY_PROCESSED",
      };
    }

    throw error;
  }

  emitNotificationToUser(
    application.candidateId,
    notification
  );

  return {
    processed: true,
    notificationId: notification.id,
  };
}

export const applicationWorker = new Worker(
  "application-events",
  async (job) => {
    console.log(
      `Processing application event: ${job.name}`
    );

    switch (job.name) {
      case "application-created":
        return processApplicationCreated(
          job.data as ApplicationCreatedPayload
        );

      case "application-status-changed":
        return processApplicationStatusChanged(
          job.data as ApplicationStatusChangedPayload
        );

      default:
        throw new Error(
          `Unknown application event: ${job.name}`
        );
    }
  },
  {
    connection: redisConnection,
  }
);

applicationWorker.on("completed", (job) => {
  console.log(
    `Application event completed: ${job.id}`
  );
});

applicationWorker.on("failed", (job, error) => {
  console.error(
    `Application event failed: ${job?.id}`,
    error
  );
});

applicationWorker.on("error", (error) => {
  console.error(
    "Application worker error:",
    error
  );
});