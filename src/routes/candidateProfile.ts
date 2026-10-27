
import { Router, Response, NextFunction } from "express";
import {
  authenticate,
  authorizeRole,
  AuthenticatedRequest,
} from "../middleware/auth.js";
import {
  createCandidateProfileSchema,
  updateCandidateProfileSchema,
} from "../validators/candidateProfileValidator.js";
import {
  getCandidateProfile,
  createCandidateProfile,
  updateCandidateProfile,
} from "../services/candidateProfileService.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorizeRole("CANDIDATE"),
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const profile = await getCandidateProfile(req.user!.userId);

      return res.status(200).json({ profile });
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  "/",
  authenticate,
  authorizeRole("CANDIDATE"),
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user!.userId;
      const existingProfile = await getCandidateProfile(userId);

      if (existingProfile) {
        const validation = updateCandidateProfileSchema.safeParse(
          req.body
        );

        if (!validation.success) {
          return res.status(400).json({
            error: "Validation failed",
            details: validation.error.issues,
          });
        }

        const profile = await updateCandidateProfile(
          userId,
          validation.data
        );

        return res.status(200).json({ profile });
      }

      const validation = createCandidateProfileSchema.safeParse(
        req.body
      );

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error.issues,
        });
      }

      try {
        const profile = await createCandidateProfile(
          userId,
          validation.data
        );

        return res.status(201).json({ profile });
      } catch (error) {
        const isUniqueConstraintError =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002";

        if (!isUniqueConstraintError) {
          throw error;
        }

        const latestProfile = await getCandidateProfile(userId);

        if (latestProfile === null) {
          throw error;
        }

        return res.status(200).json({
          profile: latestProfile,
        });
      }
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
