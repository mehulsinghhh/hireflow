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
  createCompanySchema,
  updateCompanySchema,
} from "../validators/companyValidator.js";

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
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { name, description } = req.body;

      const company = await createCompany(
        name,
        description
      );

      res.status(201).json(company);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/",
  async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const companies = await getCompanies();

      res.status(200).json(companies);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const company = await getCompanyById(id);

      if (!company) {
        return res.status(404).json({
          error: "Company not found",
        });
      }

      res.status(200).json(company);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  authenticate,
  authorizeRole("RECRUITER", "ADMIN"),
  validateBody(updateCompanySchema),
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const company = await updateCompany(
        id,
        name,
        description
      );

      res.status(200).json(company);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  authorizeRole("ADMIN"),
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      await deleteCompany(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;