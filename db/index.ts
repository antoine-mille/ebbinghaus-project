"use client";
import Dexie, { Table } from "dexie";
import {
  Course,
  CourseSchema,
  ReviewEvent,
  ReviewEventSchema,
  ReviewPlan,
  ReviewPlanSchema,
  Tag,
  TagSchema,
  QuizAttempt,
  QuizAttemptSchema,
  Outcome,
} from "@/types/schemas";

export class AppDB extends Dexie {
  courses!: Table<Course, string>;
  tags!: Table<Tag, string>;
  reviewPlans!: Table<ReviewPlan, string>;
  reviewEvents!: Table<ReviewEvent, string>;
  quizAttempts!: Table<QuizAttempt, string>;

  constructor() {
    super("ebbinghaus-crpe-db");
    this.version(1).stores({
      courses: "id, name, tagId, createdAt",
      tags: "id, name, color, createdAt",
      reviewPlans: "id, courseId, nextReviewAt, level, updatedAt",
      reviewEvents: "id, courseId, date, outcome, source",
      quizAttempts: "id, courseId, startedAt, finishedAt",
    });
  }
}

export const db = new AppDB();

// Helpers with Zod validation before writes
export async function addTag(
  input: Omit<Tag, "id" | "createdAt"> & Partial<Pick<Tag, "id" | "createdAt">>
) {
  const tag: Tag = TagSchema.parse({
    id: input.id ?? crypto.randomUUID(),
    name: input.name,
    color: input.color,
    createdAt: input.createdAt ?? new Date(),
  });
  await db.tags.add(tag);
  return tag;
}

export async function addCourse(
  input: Omit<Course, "id" | "createdAt"> &
    Partial<Pick<Course, "id" | "createdAt">>
) {
  const course: Course = CourseSchema.parse({
    id: input.id ?? crypto.randomUUID(),
    name: input.name,
    description: input.description,
    tagId: input.tagId,
    createdAt: input.createdAt ?? new Date(),
  });
  await db.courses.add(course);
  return course;
}

export async function upsertReviewPlan(plan: ReviewPlan) {
  ReviewPlanSchema.parse(plan);
  await db.reviewPlans.put(plan);
  return plan;
}

export async function getPlanForCourse(courseId: string) {
  return db.reviewPlans.where({ courseId }).first();
}

export async function addReviewEvent(ev: ReviewEvent) {
  ReviewEventSchema.parse(ev);
  await db.reviewEvents.add(ev);
  return ev;
}

export async function addQuizAttempt(attempt: QuizAttempt) {
  QuizAttemptSchema.parse(attempt);
  await db.quizAttempts.add(attempt);
  return attempt;
}

export async function listTags() {
  return db.tags.orderBy("name").toArray();
}

export async function listCourses() {
  return db.courses.orderBy("createdAt").reverse().toArray();
}

export async function deleteTag(id: string) {
  const used = await db.courses.where({ tagId: id }).count();
  if (used > 0) {
    throw new Error(`Impossible de supprimer: utilisé par ${used} cours`);
  }
  await db.tags.delete(id);
}

export async function deleteCourseCascade(courseId: string) {
  await db.transaction('rw', db.courses, db.reviewPlans, db.reviewEvents, db.quizAttempts, async () => {
    await db.reviewPlans.where({ courseId }).delete();
    await db.reviewEvents.where({ courseId }).delete();
    await db.quizAttempts.where({ courseId }).delete();
    await db.courses.delete(courseId);
  });
}

export async function listDueCourses(now = new Date()) {
  const plans = await getLatestPlans();
  const duePlans = plans.filter((p) => p.nextReviewAt <= now);
  const courseIds = new Set(duePlans.map((p) => p.courseId));
  const all = await db.courses.toArray();
  return all.filter((c) => courseIds.has(c.id));
}

export async function getCourseById(id: string) {
  return db.courses.get(id);
}

export async function listEventsForCourse(courseId: string) {
  return db.reviewEvents.where({ courseId }).reverse().sortBy("date");
}

export async function upsertInitialPlan(courseId: string, nextReviewAt: Date) {
  const existing = await getPlanForCourse(courseId);
  const plan: ReviewPlan = ReviewPlanSchema.parse({
    id: existing?.id ?? crypto.randomUUID(),
    courseId,
    level: existing?.level ?? 0,
    nextReviewAt,
    lastOutcome: existing?.lastOutcome,
    updatedAt: new Date(),
  });
  await db.reviewPlans.put(plan);
  return plan;
}

export async function recordOutcome(
  courseId: string,
  outcome: Outcome,
  nextLevel: number,
  nextReviewAt: Date
) {
  const ev: ReviewEvent = ReviewEventSchema.parse({
    id: crypto.randomUUID(),
    courseId,
    date: new Date(),
    outcome,
    source: "manual", // default; quiz page may use "AI" first then user override
  });
  await db.reviewEvents.add(ev);

  const plan: ReviewPlan = ReviewPlanSchema.parse({
    id: crypto.randomUUID(),
    courseId,
    level: nextLevel,
    nextReviewAt,
    lastOutcome: outcome,
    updatedAt: new Date(),
  });
  await db.reviewPlans.put(plan);
  return { ev, plan };
}

// Returns latest plan per course (by updatedAt)
export async function getLatestPlans() {
  const plans = await db.reviewPlans.toArray();
  const latest = new Map<string, ReviewPlan>();
  for (const p of plans) {
    const cur = latest.get(p.courseId);
    if (!cur) {
      latest.set(p.courseId, p);
      continue;
    }
    const curTime = new Date(cur.updatedAt).getTime();
    const pTime = new Date(p.updatedAt).getTime();
    if (pTime > curTime) latest.set(p.courseId, p);
  }
  return Array.from(latest.values());
}
