import { z } from "zod";

export const createJobSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  location: z.string().min(1),
  companyId: z.string().uuid(),
});

export const updateJobSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
});