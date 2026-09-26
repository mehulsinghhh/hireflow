import { Queue } from "bullmq";

const redisConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

export const applicationQueue = new Queue(
  "application-events",
  {
    connection: redisConnection,

    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  }
);

export async function enqueueApplicationCreated(
  applicationId: string
) {
  return applicationQueue.add(
    "application-created",
    {
      applicationId,
    },
    {
      jobId: `application-created-${applicationId}`,
    }
  );
}

export async function enqueueApplicationStatusChanged(
  applicationId: string,
  status:
    | "SCREENING"
    | "INTERVIEW"
    | "REJECTED"
    | "HIRED"
) {
  return applicationQueue.add(
    "application-status-changed",
    {
      applicationId,
      status,
    },
    {
      jobId: `application-status-changed-${applicationId}-${status}`,
    }
  );
}