import { Router, Request } from "express";
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
} from "../services/jobService.js";
import { authenticate, authorizeRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  createJobSchema,
  updateJobSchema,
} from "../validators/jobValidator.js";

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

router.post(
  "/",
  authenticate,
  authorizeRole("RECRUITER", "ADMIN"),
  validateBody(createJobSchema),
  async (req, res) => {
    const { title, description, location, companyId } = req.body;

    const job = await createJob(
      title,
      description,
      location,
      companyId
    );

    res.status(201).json(job);
  }
);

router.patch(
  "/:id",
  authenticate,
  authorizeRole("RECRUITER", "ADMIN"),
  validateBody(updateJobSchema),
  async (req: Request<{ id: string }>, res) => {
    const { title, description, location } = req.body;

    const job = await updateJob(
      req.params.id,
      title,
      description,
      location
    );

    res.status(200).json(job);
  }
);

router.delete(
  "/:id",
  authenticate,
  authorizeRole("ADMIN"),
  async (req: Request<{ id: string }>, res) => {
    await deleteJob(req.params.id);

    res.status(204).send();
  }
);

export default router;