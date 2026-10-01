import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app.js";

async function registerUser(
  email: string,
  role: "CANDIDATE" | "RECRUITER" | "ADMIN" = "CANDIDATE",
  password = "Password123!",
) {
  await request(app)
    .post("/api/auth/register")
    .send({
      email,
      password,
    });

  if (role !== "CANDIDATE") {
    const { prisma } = await import("../../src/lib/prisma.js");

    await prisma.user.update({
      where: { email },
      data: { role },
    });
  }

  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email,
      password,
    });

  expect(loginResponse.status).toBe(200);

  return loginResponse.body.token as string;
}

async function createRecruiter() {
  return registerUser(
    `recruiter-${Date.now()}@test.com`,
    "RECRUITER",
  );
}

async function createCandidate() {
  return registerUser(
    `candidate-${Date.now()}@test.com`,
    "CANDIDATE",
  );
}

async function createCompany(token: string) {
  const response = await request(app)
    .post("/api/companies")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: `Application Test Company ${Date.now()}`,
      description: "Company for application tests",
    });

  expect(response.status).toBe(201);

  return response.body.id as string;
}

async function createJob(
  recruiterToken: string,
  companyId: string,
) {
  const response = await request(app)
    .post("/api/jobs")
    .set("Authorization", `Bearer ${recruiterToken}`)
    .send({
      title: "Software Engineer",
      description: "Build production software",
      location: "Bangalore",
      companyId,
    });

  expect(response.status).toBe(201);

  return response.body;
}

async function createRecruiterJob() {
  const recruiterToken = await createRecruiter();
  const companyId = await createCompany(recruiterToken);
  const job = await createJob(recruiterToken, companyId);

  return {
    recruiterToken,
    job,
  };
}

async function createApplication(
  candidateToken: string,
  jobId: string,
) {
  return request(app)
    .post("/api/applications")
    .set("Authorization", `Bearer ${candidateToken}`)
    .send({
      jobId,
    });
}

describe("Applications API", () => {
  it("allows a candidate to apply to a job", async () => {
    const candidateToken = await createCandidate();

    const { job } = await createRecruiterJob();

    const response = await createApplication(
      candidateToken,
      job.id,
    );

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.jobId).toBe(job.id);
    expect(response.body.status).toBe("APPLIED");
  });

  it("prevents a candidate from applying to the same job twice", async () => {
    const candidateToken = await createCandidate();

    const { job } = await createRecruiterJob();

    const firstResponse = await createApplication(
      candidateToken,
      job.id,
    );

    expect(firstResponse.status).toBe(201);

    const secondResponse = await createApplication(
      candidateToken,
      job.id,
    );

    expect(secondResponse.status).toBe(409);
  });

  it("rejects an unauthenticated application", async () => {
    const { job } = await createRecruiterJob();

    const response = await request(app)
      .post("/api/applications")
      .send({
        jobId: job.id,
      });

    expect(response.status).toBe(401);
  });

  it("allows a candidate to view their own applications", async () => {
    const candidateToken = await createCandidate();

    const { job } = await createRecruiterJob();

    const createResponse = await createApplication(
      candidateToken,
      job.id,
    );

    expect(createResponse.status).toBe(201);

    const response = await request(app)
      .get("/api/applications/me")
      .set("Authorization", `Bearer ${candidateToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].jobId).toBe(job.id);
  });

  it("allows a candidate to view their own application by ID", async () => {
    const candidateToken = await createCandidate();

    const { job } = await createRecruiterJob();

    const createResponse = await createApplication(
      candidateToken,
      job.id,
    );

    expect(createResponse.status).toBe(201);

    const applicationId = createResponse.body.id;

    const response = await request(app)
      .get(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${candidateToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(applicationId);
    expect(response.body.jobId).toBe(job.id);
    expect(response.body.status).toBe("APPLIED");
  });

  it("allows a recruiter to view an application for their own job", async () => {
    const candidateToken = await createCandidate();

    const { recruiterToken, job } =
      await createRecruiterJob();

    const createResponse = await createApplication(
      candidateToken,
      job.id,
    );

    expect(createResponse.status).toBe(201);

    const applicationId = createResponse.body.id;

    const response = await request(app)
      .get(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${recruiterToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(applicationId);
    expect(response.body.jobId).toBe(job.id);
  });

  it("prevents another recruiter from viewing the application", async () => {
    const candidateToken = await createCandidate();

    const firstRecruiter = await createRecruiterJob();
    const secondRecruiter = await createRecruiterJob();

    const createResponse = await createApplication(
      candidateToken,
      firstRecruiter.job.id,
    );

    expect(createResponse.status).toBe(201);

    const applicationId = createResponse.body.id;

    const response = await request(app)
      .get(`/api/applications/${applicationId}`)
      .set(
        "Authorization",
        `Bearer ${secondRecruiter.recruiterToken}`,
      );

    expect(response.status).toBe(403);
  });

  it("allows a recruiter to change an application status", async () => {
    const candidateToken = await createCandidate();

    const { recruiterToken, job } =
      await createRecruiterJob();

    const createResponse = await createApplication(
      candidateToken,
      job.id,
    );

    expect(createResponse.status).toBe(201);

    const applicationId = createResponse.body.id;

    const response = await request(app)
      .patch(`/api/applications/${applicationId}/status`)
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({
        status: "SCREENING",
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("SCREENING");
  });
});

it("allows a recruiter to view applications for all of their jobs", async () => {
  const candidateToken = await createCandidate();

  const recruiter = await createRecruiter();

  const companyId = await createCompany(recruiter);

  const firstJob = await createJob(
    recruiter,
    companyId,
  );

  const secondJob = await createJob(
    recruiter,
    companyId,
  );

  const firstApplication = await createApplication(
    candidateToken,
    firstJob.id,
  );

  const secondApplication = await createApplication(
    candidateToken,
    secondJob.id,
  );

  expect(firstApplication.status).toBe(201);
  expect(secondApplication.status).toBe(201);

  const response = await request(app)
    .get("/api/applications/my-jobs")
    .set("Authorization", `Bearer ${recruiter}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body).toHaveLength(2);

  const jobIds = response.body.map(
    (application: { jobId: string }) =>
      application.jobId,
  );

  expect(jobIds).toContain(firstJob.id);
  expect(jobIds).toContain(secondJob.id);
});