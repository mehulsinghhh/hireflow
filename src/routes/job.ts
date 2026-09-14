import { Router, Request } from "express";
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
} from "../services/jobService.js";
import { authenticate, authorizeRole, AuthenticatedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  createJobSchema,
  updateJobSchema,
} from "../validators/jobValidator.js";
import { getApplicationsForJob } from "../services/applicationService.js";

const router = Router();

router.get("/", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const location =
    typeof req.query.location === "string"
      ? req.query.location
      : undefined;

  const companyId =
    typeof req.query.companyId === "string"
      ? req.query.companyId
      : undefined;

  const result = await getJobs({
    page,
    limit,
    location,
    companyId,
  });

  res.status(200).json(result);
});

router.get("/:id", async (req: Request<{ id: string }>, res) => {
  const job = await getJobById(req.params.id);

  if (!job) {
    return res.status(404).json({
      error: "Job not found",
    });
  }

  res.status(200).json(job);
});

router.get(
  "/:jobId/applications",
  authenticate,
  authorizeRole("RECRUITER", "ADMIN"),
  async (
  req: AuthenticatedRequest & Request<{ jobId: string }>,
  res,
  next
) => {
    try {
     const jobId = Array.isArray(req.params.jobId)
  ? req.params.jobId[0]
  : req.params.jobId;

const applications = await getApplicationsForJob(
  jobId,
  req.user!.userId,
  req.user!.role
);

      res.status(200).json(applications);
    } catch (error) {
      if (error instanceof Error && error.message === "JOB_NOT_FOUND") {
  return res.status(404).json({
    error: "Job not found",
  });
}

if (error instanceof Error && error.message === "FORBIDDEN") {
  return res.status(403).json({
    error: "You do not own this job",
  });
}

next(error);
    }
  }
);

router.post(
  "/",
  authenticate,
  authorizeRole("RECRUITER", "ADMIN"),
  validateBody(createJobSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { title, description, location, companyId } = req.body;

      const recruiterId = req.user?.userId;

      if (!recruiterId) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      const job = await createJob(
        title,
        description,
        location,
        companyId,
        recruiterId
      );

      res.status(201).json(job);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  authenticate,
  authorizeRole("RECRUITER", "ADMIN"),
  validateBody(updateJobSchema),
  async (req: AuthenticatedRequest<{ id: string }>, res, next) => {
    try {
      const { id } = req.params;
      const { title, description, location } = req.body;

      if (!req.user) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      const job = await updateJob(
        id,
        title,
        description,
        location,
        req.user.userId,
        req.user.role
      );

      res.status(200).json(job);
    } catch (error) {
      if (error instanceof Error && error.message === "JOB_NOT_FOUND") {
        return res.status(404).json({
          error: "Job not found",
        });
      }

      if (error instanceof Error && error.message === "JOB_FORBIDDEN") {
        return res.status(403).json({
          error: "You do not own this job",
        });
      }

      next(error);
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  authorizeRole("RECRUITER", "ADMIN"),
  async (req: AuthenticatedRequest<{ id: string }>, res, next) => {
    try {
      const { id } = req.params;

      if (!req.user) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      await deleteJob(
        id,
        req.user.userId,
        req.user.role
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "JOB_NOT_FOUND") {
        return res.status(404).json({
          error: "Job not found",
        });
      }

      if (error instanceof Error && error.message === "JOB_FORBIDDEN") {
        return res.status(403).json({
          error: "You do not own this job",
        });
      }

      next(error);
    }
  }
);

export default router;