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

  const job = await prisma.job.create({
    data: {
      title,
      companyId,
      description,
      location,
    },
  });

  res.status(201).json(job);
});

export default app;