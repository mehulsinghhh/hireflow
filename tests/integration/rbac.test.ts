import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app.js";

/**
 * Registers a user, optionally promotes their role directly
 * in the test database, and THEN logs them in.
 *
 * The order matters because the JWT stores the user's role
 * at login time.
 */
async function registerUser(
  email: string,
  role: "CANDIDATE" | "RECRUITER" | "ADMIN" = "CANDIDATE",
  password = "Password123!",
) {
  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      email,
      password,
    });

  expect(registerResponse.status).toBe(201);

  if (role !== "CANDIDATE") {
    const { prisma } = await import("../../src/lib/prisma.js");

    await prisma.user.update({
      where: {
        email,
      },
      data: {
        role,
      },
    });
  }

  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email,
      password,
    });

  expect(loginResponse.status).toBe(200);
  expect(loginResponse.body).toHaveProperty("token");

  return loginResponse.body.token as string;
}

async function createCompany(token: string, name: string) {
  return request(app)
    .post("/api/companies")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name,
      description: "Test company",
    });
}

describe("RBAC", () => {
  it("rejects a candidate from creating a company", async () => {
    const candidateToken = await registerUser(
      "candidate-rbac@test.com",
    );

    const response = await createCompany(
      candidateToken,
      "Candidate Company",
    );

    expect(response.status).toBe(403);
  });

  it("allows a recruiter to create a company", async () => {
    const recruiterToken = await registerUser(
      "recruiter-rbac@test.com",
      "RECRUITER",
    );

    const response = await createCompany(
      recruiterToken,
      "Recruiter Company",
    );

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe("Recruiter Company");
  });

  it("rejects a candidate from creating a job", async () => {
    const candidateToken = await registerUser(
      "candidate-job-rbac@test.com",
    );

    const recruiterToken = await registerUser(
      "recruiter-job-rbac@test.com",
      "RECRUITER",
    );

    // Recruiter creates the company because candidates
    // are not allowed to create companies.
    const companyResponse = await createCompany(
      recruiterToken,
      "Job Test Company",
    );

    expect(companyResponse.status).toBe(201);

    const response = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${candidateToken}`)
      .send({
        title: "Backend Engineer",
        description: "Build backend services",
        location: "Remote",
        companyId: companyResponse.body.id,
      });

    expect(response.status).toBe(403);
  });

  it("allows a recruiter to create a job", async () => {
    const recruiterToken = await registerUser(
      "recruiter-create-job@test.com",
      "RECRUITER",
    );

    const companyResponse = await createCompany(
      recruiterToken,
      "Recruiter Job Company",
    );

    expect(companyResponse.status).toBe(201);

    const response = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({
        title: "Software Engineer",
        description: "Build production software",
        location: "Bangalore",
        companyId: companyResponse.body.id,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.title).toBe("Software Engineer");
  });

  it("prevents a recruiter from updating another recruiter's job", async () => {
    const ownerToken = await registerUser(
      "job-owner@test.com",
      "RECRUITER",
    );

    const otherRecruiterToken = await registerUser(
      "other-recruiter@test.com",
      "RECRUITER",
    );

    const companyResponse = await createCompany(
      ownerToken,
      "Ownership Test Company",
    );

    expect(companyResponse.status).toBe(201);

    const jobResponse = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Original Job",
        description: "Original description",
        location: "Delhi",
        companyId: companyResponse.body.id,
      });

    expect(jobResponse.status).toBe(201);
    expect(jobResponse.body).toHaveProperty("id");

    const response = await request(app)
      .patch(`/api/jobs/${jobResponse.body.id}`)
      .set(
        "Authorization",
        `Bearer ${otherRecruiterToken}`,
      )
      .send({
        title: "Unauthorized Update",
      });

    expect(response.status).toBe(403);
  });

  it("allows an admin to update another recruiter's job", async () => {
    const recruiterToken = await registerUser(
      "admin-test-recruiter@test.com",
      "RECRUITER",
    );

    const adminToken = await registerUser(
      "admin-test@test.com",
      "ADMIN",
    );

    const companyResponse = await createCompany(
      recruiterToken,
      "Admin Ownership Company",
    );

    expect(companyResponse.status).toBe(201);

    const jobResponse = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({
        title: "Admin Test Job",
        description: "Job for admin ownership test",
        location: "Mumbai",
        companyId: companyResponse.body.id,
      });

    expect(jobResponse.status).toBe(201);
    expect(jobResponse.body).toHaveProperty("id");

    const response = await request(app)
      .patch(`/api/jobs/${jobResponse.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Admin Updated Job",
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Admin Updated Job");
  });
});