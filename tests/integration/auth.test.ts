import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app.js";

describe("Authentication", () => {
  it("registers a new candidate", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "candidate@test.com",
        password: "Password123!",
      });

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty("id");
    expect(response.body.email).toBe("candidate@test.com");
    expect(response.body.role).toBe("CANDIDATE");
    expect(response.body).toHaveProperty("createdAt");

    expect(response.body).not.toHaveProperty("passwordHash");
  });

  it("logs in and returns a JWT", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        email: "login@test.com",
        password: "Password123!",
      });

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "login@test.com",
        password: "Password123!",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(typeof response.body.token).toBe("string");
    expect(response.body.token.length).toBeGreaterThan(0);
  });

  it("allows an authenticated user to access /api/me", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        email: "me@test.com",
        password: "Password123!",
      });

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "me@test.com",
        password: "Password123!",
      });

    const token = loginResponse.body.token;

    const response = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("userId");
    expect(response.body.user).toHaveProperty("role");
    expect(response.body.user.role).toBe("CANDIDATE");
  });

  it("rejects an invalid JWT", async () => {
    const response = await request(app)
      .get("/api/me")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
  });
});