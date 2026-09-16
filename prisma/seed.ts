import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const PASSWORD = "Password123!";
const PASSWORD_HASH_ROUNDS = 10;

async function main() {
  console.log("🌱 Starting database seed...");

  const passwordHash = await bcrypt.hash(
    PASSWORD,
    PASSWORD_HASH_ROUNDS
  );

  // --------------------------------------------------
  // 1. RECRUITERS
  // --------------------------------------------------

  console.log("Creating recruiters...");

  const recruiters = [];

  for (let i = 1; i <= 20; i++) {
    const recruiter = await prisma.user.upsert({
      where: {
        email: `recruiter${i}@hireflow.test`,
      },
      update: {},
      create: {
        email: `recruiter${i}@hireflow.test`,
        passwordHash,
        role: "RECRUITER",
      },
    });

    recruiters.push(recruiter);
  }

  // --------------------------------------------------
  // 2. CANDIDATES
  // --------------------------------------------------

  console.log("Creating candidates...");

  const candidates = [];

  for (let i = 1; i <= 100; i++) {
    const candidate = await prisma.user.upsert({
      where: {
        email: `candidate${i}@hireflow.test`,
      },
      update: {},
      create: {
        email: `candidate${i}@hireflow.test`,
        passwordHash,
        role: "CANDIDATE",
      },
    });

    candidates.push(candidate);
  }

  // --------------------------------------------------
  // 3. COMPANIES
  // --------------------------------------------------

  console.log("Creating companies...");

  const companies = [];

  for (let i = 1; i <= 50; i++) {
    const company = await prisma.company.create({
      data: {
        name: `HireFlow Company ${i}`,
        description: `Technology company ${i} participating in the HireFlow hiring platform.`,
      },
    });

    companies.push(company);
  }

  // --------------------------------------------------
  // 4. JOBS
  // --------------------------------------------------

  console.log("Creating jobs...");

  const jobTitles = [
    "Backend Engineer",
    "Frontend Engineer",
    "Full Stack Developer",
    "Software Engineer",
    "Senior Backend Engineer",
    "Senior Frontend Engineer",
    "DevOps Engineer",
    "Cloud Engineer",
    "Data Engineer",
    "QA Engineer",
  ];

  const locations = [
    "Remote",
    "Bangalore",
    "Hyderabad",
    "Pune",
    "Mumbai",
    "Delhi",
    "Chennai",
    "Gurgaon",
    "Noida",
    "Kolkata",
  ];

  const jobs = [];

  for (let i = 1; i <= 1000; i++) {
    const recruiter = recruiters[(i - 1) % recruiters.length];
    const company = companies[(i - 1) % companies.length];
    const title = jobTitles[(i - 1) % jobTitles.length];
    const location = locations[(i - 1) % locations.length];

    const job = await prisma.job.create({
      data: {
        title: `${title} ${i}`,
        description: `We are looking for a ${title} to join our engineering team. This role involves building reliable software systems, collaborating with engineers, and delivering production-ready features.`,
        location,
        companyId: company.id,
        recruiterId: recruiter.id,
      },
    });

    jobs.push(job);

    if (i % 100 === 0) {
      console.log(`  Created ${i}/1000 jobs`);
    }
  }

  // --------------------------------------------------
  // 5. APPLICATIONS
  // --------------------------------------------------

  console.log("Creating applications...");

  let applicationCount = 0;

  for (let i = 0; i < 3000; i++) {
    const candidate = candidates[i % candidates.length];
    const job = jobs[(i * 7) % jobs.length];

    try {
      await prisma.application.create({
        data: {
          candidateId: candidate.id,
          jobId: job.id,
          status: "APPLIED",
        },
      });

      applicationCount++;
    } catch (error: any) {
      // Duplicate candidate/job combinations are prevented
      // by the database unique constraint.
      if (error.code !== "P2002") {
        throw error;
      }
    }
  }

  console.log(`Created ${applicationCount} applications`);

  console.log("");
  console.log("✅ Seed completed successfully");
  console.log("");
  console.log("Seed login credentials:");
  console.log(`Password: ${PASSWORD}`);
  console.log("");
  console.log("Example recruiter:");
  console.log("recruiter1@hireflow.test");
  console.log("");
  console.log("Example candidate:");
  console.log("candidate1@hireflow.test");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });