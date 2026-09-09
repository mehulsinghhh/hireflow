import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.js";
import { authenticate, AuthenticatedRequest } from "./middleware/auth.js";
import companyRouter from "./routes/company.js";
import jobRouter from "./routes/job.js";
import applicationRouter from "./routes/application.js";

const app = express();

app.use(express.json());

app.use("/api/jobs", jobRouter);

app.use("/api/auth", authRouter);

app.use("/api/companies", companyRouter);

app.use("/api/applications", applicationRouter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "hireflow-api",
  });
});

app.get(
  "/api/me",
  authenticate,
  (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      message: "Authenticated successfully",
      user: req.user,
    });
  }
);

app.use(errorHandler);

export default app;