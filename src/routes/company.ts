import { Router, Request } from "express";
import {
  authenticate,
  authorizeRole,
  AuthenticatedRequest,
} from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createCompanySchema } from "../validators/companyValidator.js";
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "../services/companyService.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizeRole("RECRUITER", "ADMIN"),
  validateBody(createCompanySchema),
  async (req: AuthenticatedRequest, res) => {
    const { name, description } = req.body;

    const company = await createCompany(name, description);

    res.status(201).json(company);
  }
);

router.get("/", async (_req, res) => {
  const companies = await getCompanies();

  res.status(200).json(companies);
});

router.get("/:id", async (req, res) => {
  const company = await getCompanyById(req.params.id);

  if (!company) {
    return res.status(404).json({
      error: "Company not found",
    });
  }

  res.status(200).json(company);
});

router.patch(
  "/:id",
  authenticate,
  authorizeRole("RECRUITER", "ADMIN"),
  async (req: Request<{ id: string }>, res) => {
    const { name, description } = req.body;
    const { id } = req.params;
    const company = await updateCompany(
      req.params.id,
      name,
      description
    );

    res.status(200).json(company);
  }
);

router.delete(
  "/:id",
  authenticate,
  authorizeRole("ADMIN"),
  async (req: Request<{ id: string }>, res) => {
    await deleteCompany(req.params.id);

    res.status(204).send();
  }
);

export default router;