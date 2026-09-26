import {
  Router,
  Request,
  Response,
  NextFunction,
} from "express";
import {
  authenticate,
  authorizeRole,
  AuthenticatedRequest,
} from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  createApplicationSchema,
  updateApplicationStatusSchema,
} from "../validators/applicationValidator.js";
import {
  createApplication,
  getApplicationsForJob,
  updateApplicationStatus,
} from "../services/applicationService.js";
import { prisma } from "../lib/prisma.js";
import { applicationPublicSelect } from "../lib/selects.js";


const router = Router();

router.post(
  "/",
  authenticate,
  authorizeRole("CANDIDATE"),
  validateBody(createApplicationSchema),
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { jobId } = req.body;

      const application = await createApplication(
        req.user!.userId,
        jobId
      );

      res.status(201).json(application);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "JOB_NOT_FOUND") {
          return res.status(404).json({
            error: "Job not found",
          });
        }

        if (
          error.message ===
          "APPLICATION_ALREADY_EXISTS"
        ) {
          return res.status(409).json({
            error:
              "You have already applied to this job",
          });
        }
      }

      next(error);
    }
  }
);

router.get(
  "/me",
  authenticate,
  authorizeRole("CANDIDATE"),
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const applications =
        await prisma.application.findMany({
          where: {
            candidateId: req.user!.userId,
          },
          select: applicationPublicSelect,
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
  async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const applications =
        await prisma.application.findMany({
          select: applicationPublicSelect,
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

router.patch(
  "/:id/status",
  authenticate,
  authorizeRole("RECRUITER", "ADMIN"),
  validateBody(updateApplicationStatusSchema),
  async (
    req: AuthenticatedRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const application =
        await updateApplicationStatus(
          id,
          status,
          req.user!.userId,
          req.user!.role
        );

      res.status(200).json(application);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === "APPLICATION_NOT_FOUND"
        ) {
          return res.status(404).json({
            error: "Application not found",
          });
        }

        if (error.message === "FORBIDDEN") {
          return res.status(403).json({
            error:
              "You do not have access to this application",
          });
        }

        if (
          error.message ===
          "INVALID_STATUS_TRANSITION"
        ) {
          return res.status(400).json({
            error:
              "Invalid application status transition",
          });
        }
      }

      next(error);
    }
  }
);

router.get(
  "/:id",
  authenticate,
  async (
    req: AuthenticatedRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const application =
        await prisma.application.findUnique({
          where: {
            id,
          },
          select: {
            ...applicationPublicSelect,
            job: {
              select: {
                ...applicationPublicSelect.job.select,
                recruiterId: true,
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

      const isRecruiter =
        req.user!.role === "RECRUITER" &&
        application.job.recruiterId === req.user!.userId;

      const isAdmin = req.user!.role === "ADMIN";

      if (!isCandidate && !isRecruiter && !isAdmin) {
        return res.status(403).json({
          error: "Forbidden",
        });
      }

      const {
        recruiterId: _recruiterId,
        ...safeJob
      } = application.job;

      res.status(200).json({
        ...application,
        job: safeJob,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;