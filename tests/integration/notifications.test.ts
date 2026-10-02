import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

async function registerUser(
  email: string,
  role: "CANDIDATE" | "RECRUITER" | "ADMIN" = "CANDIDATE",
) {
  await request(app)
    .post("/api/auth/register")
    .send({
      email,
      password: "Password123!",
    });

  if (role !== "CANDIDATE") {
    await prisma.user.update({
      where: { email },
      data: { role },
    });
  }

  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email,
      password: "Password123!",
    });

  expect(loginResponse.status).toBe(200);

  return loginResponse.body.token as string;
}

async function createCandidate() {
  return registerUser(
    `candidate-${crypto.randomUUID()}@test.com`,
    "CANDIDATE",
  );
}

async function createRecruiter() {
  return registerUser(
    `recruiter-${crypto.randomUUID()}@test.com`,
    "RECRUITER",
  );
}

async function createTestApplication(
  candidateToken: string,
) {
  const meResponse = await request(app)
    .get("/api/me")
    .set(
      "Authorization",
      `Bearer ${candidateToken}`,
    );

  expect(meResponse.status).toBe(200);

  const candidateId =
    meResponse.body.user.userId;

  const recruiterToken = await createRecruiter();

  const recruiterResponse = await request(app)
    .get("/api/me")
    .set(
      "Authorization",
      `Bearer ${recruiterToken}`,
    );

  expect(recruiterResponse.status).toBe(200);

  const recruiterId =
    recruiterResponse.body.user.userId;

  const company = await prisma.company.create({
    data: {
      name: `Notification Test Company ${crypto.randomUUID()}`,
      description: "Company for notification tests",
    },
  });

  const job = await prisma.job.create({
    data: {
      title: "Software Engineer",
      description: "Build production software",
      location: "Bangalore",
      companyId: company.id,
      recruiterId,
    },
  });

  const application = await prisma.application.create({
    data: {
      candidateId,
      jobId: job.id,
    },
  });

  return {
    candidateId,
    applicationId: application.id,
  };
}

async function createTestNotification(
  candidateToken: string,
) {
  const { candidateId, applicationId } =
    await createTestApplication(
      candidateToken,
    );

  const notification =
    await prisma.notification.create({
      data: {
        recipientId: candidateId,
        applicationId,
        type: "APPLICATION_CREATED",
        message: "You applied to a job.",
        eventKey: `test-${crypto.randomUUID()}`,
      },
      select: {
        id: true,
        type: true,
        message: true,
        readAt: true,
        applicationId: true,
        createdAt: true,
      },
    });

  return notification;
}

describe("Notifications API", () => {
  it("allows an authenticated user to retrieve notifications", async () => {
    const candidateToken = await createCandidate();

    const notification =
      await createTestNotification(
        candidateToken,
      );

    const response = await request(app)
      .get("/api/notifications")
      .set(
        "Authorization",
        `Bearer ${candidateToken}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.notifications).toHaveLength(1);
    expect(response.body.notifications[0].id).toBe(
      notification.id,
    );
    expect(
      response.body.notifications[0].type,
    ).toBe("APPLICATION_CREATED");
    expect(
      response.body.notifications[0].readAt,
    ).toBeNull();
  });

  it("returns the correct unread notification count", async () => {
    const candidateToken = await createCandidate();

    await createTestNotification(
      candidateToken,
    );

    const response = await request(app)
      .get("/api/notifications/unread-count")
      .set(
        "Authorization",
        `Bearer ${candidateToken}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
  });

  it("returns only unread notifications with unread=true", async () => {
    const candidateToken = await createCandidate();

    const unreadNotification =
      await createTestNotification(
        candidateToken,
      );

    const readNotification =
      await createTestNotification(
        candidateToken,
      );

    await prisma.notification.update({
      where: {
        id: readNotification.id,
      },
      data: {
        readAt: new Date(),
      },
    });

    const response = await request(app)
      .get("/api/notifications?unread=true")
      .set(
        "Authorization",
        `Bearer ${candidateToken}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.notifications).toHaveLength(1);
    expect(
      response.body.notifications[0].id,
    ).toBe(unreadNotification.id);
    expect(response.body.pagination.total).toBe(1);
  });

  it("allows a user to mark their notification as read", async () => {
    const candidateToken = await createCandidate();

    const notification =
      await createTestNotification(
        candidateToken,
      );

    const response = await request(app)
      .patch(
        `/api/notifications/${notification.id}/read`,
      )
      .set(
        "Authorization",
        `Bearer ${candidateToken}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(
      notification.id,
    );
    expect(response.body.readAt).not.toBeNull();
  });

  it("returns zero unread notifications after marking one as read", async () => {
    const candidateToken = await createCandidate();

    const notification =
      await createTestNotification(
        candidateToken,
      );

    const markReadResponse = await request(app)
      .patch(
        `/api/notifications/${notification.id}/read`,
      )
      .set(
        "Authorization",
        `Bearer ${candidateToken}`,
      );

    expect(markReadResponse.status).toBe(200);

    const response = await request(app)
      .get("/api/notifications/unread-count")
      .set(
        "Authorization",
        `Bearer ${candidateToken}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(0);
  });

  it("prevents another user from marking the notification as read", async () => {
    const candidateToken = await createCandidate();
    const otherCandidateToken =
      await createCandidate();

    const notification =
      await createTestNotification(
        candidateToken,
      );

    const response = await request(app)
      .patch(
        `/api/notifications/${notification.id}/read`,
      )
      .set(
        "Authorization",
        `Bearer ${otherCandidateToken}`,
      );

    expect(response.status).toBe(404);
  });

  it("rejects unauthenticated notification access", async () => {
    const response = await request(app)
      .get("/api/notifications");

    expect(response.status).toBe(401);
  });

  it("supports notification pagination", async () => {
    const candidateToken = await createCandidate();

    await createTestNotification(
      candidateToken,
    );

    await createTestNotification(
      candidateToken,
    );

    const response = await request(app)
      .get("/api/notifications?page=1&limit=1")
      .set(
        "Authorization",
        `Bearer ${candidateToken}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.notifications).toHaveLength(1);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(1);
    expect(response.body.pagination.total).toBe(2);
    expect(response.body.pagination.totalPages).toBe(2);
  });
});