
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
    .send({ email, password });

  if (role !== "CANDIDATE") {
    const { prisma } = await import("../../src/lib/prisma.js");

    await prisma.user.update({
      where: { email },
      data: { role },
    });
  }

  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  expect(response.status).toBe(200);
  return response.body.token as string;
}

const validProfile = {
  firstName: "Mehul",
  lastName: "Singh",
  phone: "9876543210",
  location: "India",
  headline: "Junior Software Developer",
  summary: "Interested in building reliable web applications.",
  skills: ["TypeScript", "PostgreSQL"],
  linkedinUrl: "https://www.linkedin.com/in/example",
  portfolioUrl: "https://example.com",
};

describe("Candidate Profile API", () => {
  it("returns null when the candidate has no profile", async () => {
    const token = await registerUser(`candidate-${Date.now()}@test.com`);

    const response = await request(app)
      .get("/api/candidate-profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.profile).toBeNull();
  });

  it("keeps each candidate's profile isolated to their own account", async () => {
  const tokenA = await registerUser(`candidate-a-${Date.now()}@test.com`);
  const tokenB = await registerUser(`candidate-b-${Date.now()}@test.com`);

  const createResponse = await request(app)
    .patch("/api/candidate-profile")
    .set("Authorization", `Bearer ${tokenA}`)
    .send(validProfile)
    .expect(201);

  const otherCandidateResponse = await request(app)
    .get("/api/candidate-profile")
    .set("Authorization", `Bearer ${tokenB}`)
    .expect(200);

  expect(otherCandidateResponse.body.profile).toBeNull();

  await request(app)
    .patch("/api/candidate-profile")
    .set("Authorization", `Bearer ${tokenB}`)
    .send({ headline: "Changed by another candidate" })
    .expect(400);

  const ownerResponse = await request(app)
    .get("/api/candidate-profile")
    .set("Authorization", `Bearer ${tokenA}`)
    .expect(200);

  expect(ownerResponse.body.profile.id).toBe(
    createResponse.body.profile.id,
  );
  expect(ownerResponse.body.profile.headline).toBe(validProfile.headline);
});

  it("creates and retrieves a candidate profile", async () => {
    const token = await registerUser(`candidate-${Date.now()}@test.com`);

    const createResponse = await request(app)
      .patch("/api/candidate-profile")
      .set("Authorization", `Bearer ${token}`)
      .send(validProfile);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.profile.firstName).toBe("Mehul");
    expect(createResponse.body.profile.skills).toEqual([
      "TypeScript",
      "PostgreSQL",
    ]);
    expect(createResponse.body.profile).not.toHaveProperty("passwordHash");
    expect(createResponse.body.profile).not.toHaveProperty("resumeStorageKey");
    expect(createResponse.body.profile).not.toHaveProperty("user");

    const getResponse = await request(app)
      .get("/api/candidate-profile")
      .set("Authorization", `Bearer ${token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.profile.id).toBe(
      createResponse.body.profile.id,
    );
  });

  it("updates only supplied fields and preserves the others", async () => {
    const token = await registerUser(`candidate-${Date.now()}@test.com`);

    await request(app)
      .patch("/api/candidate-profile")
      .set("Authorization", `Bearer ${token}`)
      .send(validProfile)
      .expect(201);

    const response = await request(app)
      .patch("/api/candidate-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ headline: "Full Stack Developer" });

    expect(response.status).toBe(200);
    expect(response.body.profile.headline).toBe("Full Stack Developer");
    expect(response.body.profile.firstName).toBe("Mehul");
    expect(response.body.profile.phone).toBe("9876543210");
  });

  it("clears optional fields when null is provided", async () => {
  const token = await registerUser(`candidate-clear-${Date.now()}@test.com`);

  await request(app)
    .patch("/api/candidate-profile")
    .set("Authorization", `Bearer ${token}`)
    .send(validProfile)
    .expect(201);

  const response = await request(app)
    .patch("/api/candidate-profile")
    .set("Authorization", `Bearer ${token}`)
    .send({
      headline: null,
      location: null,
      linkedinUrl: null,
      skills: [],
    })
    .expect(200);

  expect(response.body.profile.headline).toBeNull();
  expect(response.body.profile.location).toBeNull();
  expect(response.body.profile.linkedinUrl).toBeNull();
  expect(response.body.profile.skills).toEqual([]);

  // Unchanged fields must remain intact.
  expect(response.body.profile.firstName).toBe("Mehul");
  expect(response.body.profile.summary).toBe(validProfile.summary);
});


  it("rejects creation without required fields", async () => {
    const token = await registerUser(`candidate-${Date.now()}@test.com`);

    const response = await request(app)
      .patch("/api/candidate-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Mehul" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
  });

  it("rejects unknown and protected fields", async () => {
    const token = await registerUser(`candidate-${Date.now()}@test.com`);

    const response = await request(app)
      .patch("/api/candidate-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...validProfile,
        userId: "another-user-id",
      });

    expect(response.status).toBe(400);
  });

  it("rejects invalid URLs and invalid skills", async () => {
    const token = await registerUser(`candidate-${Date.now()}@test.com`);

    const invalidUrlResponse = await request(app)
      .patch("/api/candidate-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validProfile, linkedinUrl: "not-a-url" });

    expect(invalidUrlResponse.status).toBe(400);

    const unsafeUrlResponse = await request(app)
  .patch("/api/candidate-profile")
  .set("Authorization", `Bearer ${token}`)
  .send({
    ...validProfile,
    linkedinUrl: "javascript:alert(1)",
  });

    expect(unsafeUrlResponse.status).toBe(400);

    const invalidSkillsResponse = await request(app)
      .patch("/api/candidate-profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validProfile, skills: [""] });

    expect(invalidSkillsResponse.status).toBe(400);
  });

  it("rejects unauthenticated requests", async () => {
    await request(app)
      .get("/api/candidate-profile")
      .expect(401);

    await request(app)
      .patch("/api/candidate-profile")
      .send(validProfile)
      .expect(401);
  });

  it.each(["RECRUITER", "ADMIN"] as const)(
    "denies %s access to candidate-only profile endpoints",
    async (role) => {
      const token = await registerUser(
        `${role.toLowerCase()}-${Date.now()}@test.com`,
        role,
      );

      await request(app)
        .get("/api/candidate-profile")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      await request(app)
        .patch("/api/candidate-profile")
        .set("Authorization", `Bearer ${token}`)
        .send(validProfile)
        .expect(403);
    },
  );
});
