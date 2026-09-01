import express from "express";
import { prisma } from "./lib/prisma.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "hireflow-api",
  });
});

app.post("/api/jobs", async (req, res) => {
  const { title, companyId, description, location } = req.body;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    res.status(404).json({
      error: "Company not found",
    });
    return;
  }

  const job = await prisma.job.create({
    data: {
      title,
      companyId,
      description,
      location,
    },
    include: {
      company: true,
    },
  });

  res.status(201).json(job);
});


app.get("/api/jobs", async (req, res) => {
  const jobs = await prisma.job.findMany({
    include: {
      company: true,
    },
  });

  res.status(200).json(jobs);
});


app.get("/api/jobs/:id", async (req, res) => {
  const { id } = req.params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      company: true,
    },
  });

  if (!job) {
    res.status(404).json({
      error: "Job not found",
    });
    return;
  }

  res.status(200).json(job);
});


app.patch("/api/jobs/:id", async (req, res) => {
  const { id } = req.params;
  const { title, companyId, description, location } = req.body;

  const existingJob = await prisma.job.findUnique({
    where: { id },
  });

  if (!existingJob) {
    res.status(404).json({
      error: "Job not found",
    });
    return;
  }

  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      res.status(404).json({
        error: "Company not found",
      });
      return;
    }
  }

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(companyId !== undefined && { companyId }),
      ...(description !== undefined && { description }),
      ...(location !== undefined && { location }),
    },
    include: {
      company: true,
    },
  });

  res.status(200).json(job);
});


app.delete("/api/jobs/:id", async (req, res) => {
  const { id } = req.params;

  const existingJob = await prisma.job.findUnique({
    where: { id },
  });

  if (!existingJob) {
    res.status(404).json({
      error: "Job not found",
    });
    return;
  }

  await prisma.job.delete({
    where: { id },
  });

  res.status(204).send();
});


app.post("/api/companies", async (req, res) => {
  const { name, description } = req.body;

  const company = await prisma.company.create({
    data: {
      name,
      description,
    },
  });

  res.status(201).json(company);
});

app.get("/api/companies", async (req, res) => {
  const companies = await prisma.company.findMany();

  res.status(200).json(companies);
});


app.get("/api/companies/:id", async (req, res) => {
  const { id } = req.params;

  const company = await prisma.company.findUnique({
    where: { id },
  });

  if (!company) {
    res.status(404).json({
      error: "Company not found",
    });
    return;
  }

  res.status(200).json(company);
});


app.patch("/api/companies/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const existingCompany = await prisma.company.findUnique({
    where: { id },
  });

  if (!existingCompany) {
    res.status(404).json({
      error: "Company not found",
    });
    return;
  }

  const company = await prisma.company.update({
    where: { id },
    data: {
      name,
      description,
    },
  });

  res.status(200).json(company);
});


app.delete("/api/companies/:id", async (req, res) => {
  const { id } = req.params;

  const existingCompany = await prisma.company.findUnique({
    where: { id },
  });

  if (!existingCompany) {
    res.status(404).json({
      error: "Company not found",
    });
    return;
  }

  await prisma.company.delete({
    where: { id },
  });

  res.status(204).send();
});


app.post("/api/applications", async (req, res) => {
  try {
    const { candidateId, jobId } = req.body;

    const application = await prisma.application.create({
      data: {
        candidateId,
        jobId,
      },
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(400).json({
      error: "Could not create application",
    });
  }
});

export default app;
