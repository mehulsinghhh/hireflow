import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET ?? (() => {
  throw new Error("JWT_SECRET is not configured");
})();

export interface AuthenticatedRequest<
  Params = Record<string, string>
> extends Request<Params> {
  user?: {
    userId: string;
    role: "CANDIDATE" | "RECRUITER" | "ADMIN";
  };
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Authorization header required",
    });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Invalid authorization format",
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.userId !== "string" ||
      !["CANDIDATE", "RECRUITER", "ADMIN"].includes(
        payload.role as string
      )
    ) {
      return res.status(401).json({
        error: "Invalid token payload",
      });
    }

    req.user = {
      userId: payload.userId,
      role: payload.role as
        | "CANDIDATE"
        | "RECRUITER"
        | "ADMIN",
    };

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}


export function authorizeRole(
  ...allowedRoles: Array<"CANDIDATE" | "RECRUITER" | "ADMIN">
) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
      });
    }

    next();
  };
}