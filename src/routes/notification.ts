import {
  Router,
  Request,
  Response,
  NextFunction,
} from "express";

import {
  authenticate,
  AuthenticatedRequest,
} from "../middleware/auth.js";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from "../services/notificationService.js";

const router = Router();

router.get(
  "/",
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const pageParam = Number(req.query.page ?? 1);
      const limitParam = Number(req.query.limit ?? 20);

      if (
        !Number.isInteger(pageParam) ||
        pageParam < 1
      ) {
        return res.status(400).json({
          error: "page must be a positive integer",
        });
      }

      if (
        !Number.isInteger(limitParam) ||
        limitParam < 1 ||
        limitParam > 100
      ) {
        return res.status(400).json({
          error: "limit must be between 1 and 100",
        });
      }

      const unreadOnly =
        req.query.unread === "true";

      const result = await getNotifications(
        req.user!.userId,
        {
          page: pageParam,
          limit: limitParam,
          unreadOnly,
        }
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/unread-count",
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const count =
        await getUnreadNotificationCount(
          req.user!.userId
        );

      res.status(200).json({
        count,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/read",
  authenticate,
  async (
    req: AuthenticatedRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const notification =
        await markNotificationAsRead(
          req.params.id,
          req.user!.userId
        );

      res.status(200).json(notification);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "NOTIFICATION_NOT_FOUND"
      ) {
        return res.status(404).json({
          error: "Notification not found",
        });
      }

      next(error);
    }
  }
);

export default router;