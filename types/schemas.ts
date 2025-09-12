import { z } from "zod";

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#([0-9a-fA-F]{6})$/, "Couleur hex attendue"),
  createdAt: z.date(),
});

export type Tag = z.infer<typeof TagSchema>;

export const CourseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  tagId: z.string().uuid().optional(),
  createdAt: z.date(),
});

export type Course = z.infer<typeof CourseSchema>;

export const OutcomeEnum = z.enum(["success", "fail"]);
export type Outcome = z.infer<typeof OutcomeEnum>;

export const ReviewPlanSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  level: z.number().int().min(0),
  nextReviewAt: z.date(),
  lastOutcome: OutcomeEnum.optional(),
  updatedAt: z.date(),
});

export type ReviewPlan = z.infer<typeof ReviewPlanSchema>;

export const ReviewEventSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  date: z.date(),
  outcome: OutcomeEnum,
  source: z.enum(["AI", "manual"]),
});

export type ReviewEvent = z.infer<typeof ReviewEventSchema>;

export const QuizAttemptSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  aiScore: z.number().min(0).max(1).optional(),
  userOverride: OutcomeEnum.optional(),
});

export type QuizAttempt = z.infer<typeof QuizAttemptSchema>;

// Convenience presets for tag colors (to keep UI within HeroUI components)
export const PresetTagColors = [
  "#2563eb", // blue-600
  "#dc2626", // red-600
  "#16a34a", // green-600
  "#f59e0b", // amber-500
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#ea580c", // orange-600
] as const;

