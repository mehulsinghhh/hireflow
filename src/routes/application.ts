import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  authorizeRole,
  AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizeRole("CANDIDATE"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.body;

      if (typeof jobId !== "string" || !jobId) {
        return res.status(400).json({
          error: "jobId is required",
        });
      }

      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        return res.status(404).json({
          error: "Job not found",
        });
      }

      const existingApplication = await prisma.application.findUnique({
        where: {
          candidateId_jobId: {
            candidateId: req.user!.userId,
            jobId,
          },
        },
      });

      if (existingApplication) {
        return res.status(409).json({
          error: "You have already applied to this job",
        });
      }

      const application = await prisma.application.create({
        data: {
          candidateId: req.user!.userId,
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
  }
);

router.get(
  "/me",
  authenticate,
  authorizeRole("CANDIDATE"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const applications = await prisma.application.findMany({
        where: {
          candidateId: req.user!.userId,
        },
        include: {
          candidate: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          job: {
            include: {
              company: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.status(200).json(applications);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/",
  authenticate,
  authorizeRole("ADMIN"),
  async (_req: Request, res: Response, next: NextFunction) => {
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
        orderBy: {
          createdAt: "desc",
        },
      });

      res.status(200).json(applications);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  authenticate,
  async (
    req: AuthenticatedRequest & Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
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

      const isCandidate =
        req.user!.role === "CANDIDATE" &&
        application.candidateId === req.user!.userId;

      const isAdmin = req.user!.role === "ADMIN";

      if (!isCandidate && !isAdmin) {
        return res.status(403).json({
          error: "Forbidden",
        });
      }

      res.status(200).json(application);
    } catch (error) {
      next(error);
    }
  }
);

export default router;