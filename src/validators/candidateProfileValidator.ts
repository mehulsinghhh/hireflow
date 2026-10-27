
import { z } from "zod";

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).nullable().optional();

const optionalUrl = z
  .url({
    protocol: /^https?$/,
    error: "Must be a valid HTTP or HTTPS URL",
  })
  .trim()
  .max(2048)
  .nullable()
  .optional();

const optionalSkills = z
  .array(z.string().trim().min(1).max(100))
  .max(50)
  .optional();

export const updateCandidateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().min(1).max(50).optional(),
    location: optionalText(200),
    headline: optionalText(200),
    summary: optionalText(5000),
    skills: optionalSkills,
    linkedinUrl: optionalUrl,
    portfolioUrl: optionalUrl,
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one profile field must be provided" },
  );

export const createCandidateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(1).max(50),
    location: optionalText(200),
    headline: optionalText(200),
    summary: optionalText(5000),
    skills: optionalSkills,
    linkedinUrl: optionalUrl,
    portfolioUrl: optionalUrl,
  })
  .strict();
