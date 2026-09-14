import { z } from "zod";

export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum([
    "SCREENING",
    "INTERVIEW",
    "REJECTED",
    "HIRED",
  ]),
});