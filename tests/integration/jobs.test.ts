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

async function createCompany(token: string) {
  const response = await request(app)
    .post("/api/companies")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: `Test Company ${Date.now()}`,
      description: "Company for integration testing",
    });

  expect(response.status).toBe(201);

  return response.body.id as string;
}

async function createJob(
  token: string,
  companyId: string,
) {
  const response = await request(app)
    .post("/api/jobs")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Software Engineer",
      description: "Build production software",
      location: "Bangalore",
      companyId,
    });

  expect(response.status).toBe(201);

  return response.body;
}

describe("Jobs API", () => {
  it("returns a list of jobs", async () => {
    const recruiterToken = await createRecruiter();
    const companyId = await createCompany(recruiterToken);

    await createJob(recruiterToken, companyId);

    const response = await request(app)
      .get("/api/jobs");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("jobs");
    expect(Array.isArray(response.body.jobs)).toBe(true);
  });

  it("supports pagination", async () => {
    const recruiterToken = await createRecruiter();
    const companyId = await createCompany(recruiterToken);

    await createJob(recruiterToken, companyId);
    await createJob(recruiterToken, companyId);

    const response = await request(app)
      .get("/api/jobs?page=1&limit=1");

    expect(response.status).toBe(200);
    expect(response.body.jobs).toHaveLength(1);
  });

  it("filters jobs by location", async () => {
    const recruiterToken = await createRecruiter();
    const companyId = await createCompany(recruiterToken);

    await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({
        title: "Bangalore Engineer",
        description: "Bangalore role",
        location: "Bangalore",
        companyId,
      });

    await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({
        title: "Delhi Engineer",
        description: "Delhi role",
        location: "Delhi",
        companyId,
      });

    const response = await request(app)
      .get("/api/jobs?location=Bangalore");

    expect(response.status).toBe(200);

    expect(
      response.body.jobs.every(
        (job: { location: string }) =>
          job.location === "Bangalore",
      ),
    ).toBe(true);
  });

  it("returns a specific job by ID", async () => {
    const recruiterToken = await createRecruiter();
    const companyId = await createCompany(recruiterToken);

    const job = await createJob(
      recruiterToken,
      companyId,
    );

    const response = await request(app)
      .get(`/api/jobs/${job.id}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(job.id);
    expect(response.body.title).toBe("Software Engineer");
  });

  it("allows a recruiter to update their own job", async () => {
    const recruiterToken = await createRecruiter();
    const companyId = await createCompany(recruiterToken);

    const job = await createJob(
      recruiterToken,
      companyId,
    );

    const response = await request(app)
      .patch(`/api/jobs/${job.id}`)
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({
        title: "Senior Software Engineer",
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe(
      "Senior Software Engineer",
    );
  });

  it("allows a recruiter to delete their own job", async () => {
    const recruiterToken = await createRecruiter();
    const companyId = await createCompany(recruiterToken);

    const job = await createJob(
      recruiterToken,
      companyId,
    );

    const deleteResponse = await request(app)
      .delete(`/api/jobs/${job.id}`)
      .set("Authorization", `Bearer ${recruiterToken}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app)
      .get(`/api/jobs/${job.id}`);

    expect(getResponse.status).toBe(404);
  });
});