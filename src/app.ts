import express from "express";
import { prisma } from "./lib/prisma.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.js";
import { authenticate, authorizeRole, AuthenticatedRequest } from "./middleware/auth.js";
import { validateBody } from "./middleware/validate.js";
import { createCompanySchema } from "./validators/companyValidator.js";
import companyRouter from "./routes/company.js";
import jobRouter from "./routes/job.js";


const app = express();

app.use(express.json());

app.use("/api/jobs", jobRouter);

app.use("/api/auth", authRouter);

app.use("/api/companies", companyRouter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "hireflow-api",
  });
});


app.post("/api/applications", async (req, res, next) => {
  try {
    const { candidateId, jobId } = req.body;

    if (
      typeof candidateId !== "string" ||
      typeof jobId !== "string" ||
      !candidateId ||
      !jobId
    ) {
      return res.status(400).json({
        error: "candidateId and jobId are required",
      });
    }

    const application = await prisma.application.create({
      data: {
        candidateId,
        jobId,
      },
      include: {
        candidate: true,
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    res.status(201).json(application);
  } catch (error) {
    next(error);
  }
});

app.get("/api/applications", async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      include: {
        candidate: true,
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({
      error: "Could not fetch applications",
    });
  }
});


app.get("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        error: "Application not found",
      });
    }

    res.status(200).json(application);
  } catch (error) {
    res.status(500).json({
      error: "Could not fetch application",
    });
  }
});

app.get(
  "/api/me",
  authenticate,
  (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      message: "Authenticated successfully",
      user: req.user,
    });
  }
);

app.use(errorHandler);

export default app;
