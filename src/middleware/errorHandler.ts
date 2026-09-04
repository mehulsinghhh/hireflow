import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err.code === "P2002") {
    return res.status(409).json({
      error: "A record with this value already exists",
    });
  }

  if (err.code === "P2003") {
    return res.status(400).json({
      error: "Referenced record does not exist",
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      error: "Requested record was not found",
    });
  }

  res.status(500).json({
    error: "Internal server error",
  });
};