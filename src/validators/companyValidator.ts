import { z } from "zod";

export const createCompanySchema = z.object({
  name: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be at most 100 characters"),

  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
});