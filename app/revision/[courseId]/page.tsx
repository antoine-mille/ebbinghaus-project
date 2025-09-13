"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";

import { QuizRunner } from "@/components/QuizRunner";
import { db } from "@/db";
import { scheduleNext } from "@/lib/scheduler";
import { makeDateKey, markDayDone, scheduleReminders } from "@/lib/scheduleClient";

export default function RevisionPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<{
    id: string;
    name: string;
    description?: string;
    tagId?: string;
  } | null>(null);
  const [plan, setPlan] = useState<{ level: number } | null>(null);
  const [tag, setTag] = useState<{ name: string; color: string } | null>(null);

  useEffect(() => {
    (async () => {
      const c = await db.courses.get(params.courseId);
      if (!c) return;
      const p = await db.reviewPlans.where({ courseId: c.id }).first();
      setCourse(c);
      setPlan(p ? { level: p.level } : { level: 0 });
      if (c.tagId) {
        const t = await db.tags.get(c.tagId);
        setTag(t ?? null);
      } else {
        setTag(null);
      }
    })();
  }, [params.courseId]);

  if (!course || !plan) return null;

  const LEVEL_STAGES = [
    { label: "Découverte" },
    { label: "Rappel court" },
    { label: "Consolidation" },
    { label: "Rappel moyen" },
    { label: "Maîtrise" },
    { label: "Ancrage long" },
  ] as const;
  const phaseIdx = Math.max(0, Math.min(plan.level, LEVEL_STAGES.length - 1));
  const phaseLabel = `${phaseIdx + 1}/${LEVEL_STAGES.length} — ${LEVEL_STAGES[phaseIdx].label}`;

  async function onFinish(result: {
    aiScore: number;
    userOutcome: "success" | "fail";
  }) {
    const { nextLevel, nextDate } = scheduleNext({
      level: plan!.level,
      outcome: result.userOutcome,
    });
    // Record result and plan
    await db.reviewEvents.add({
      id: crypto.randomUUID(),
      courseId: course!.id,
      date: new Date(),
      outcome: result.userOutcome,
      source: "manual",
    });
    const existing = await db.reviewPlans
      .where({ courseId: course!.id })
      .first();
    await db.reviewPlans.put({
      id: existing?.id ?? crypto.randomUUID(),
      courseId: course!.id,
      level: nextLevel,
      nextReviewAt: nextDate,
      lastOutcome: result.userOutcome,
      updatedAt: new Date(),
    });
    // Marquer la journée comme faite pour stopper les rappels du jour
    try {
      await markDayDone({ courseId: course!.id, dateKey: makeDateKey(new Date()) });
    } catch {
      // ignore
    }
    // Planifier les rappels pour la prochaine révision
    try {
      await scheduleReminders({ courseId: course!.id, courseName: course!.name, nextReviewAt: nextDate });
    } catch {
      // ignore
    }
    router.push("/dashboard");
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardBody className="grid gap-2 py-3">
          <div className="flex items-center gap-2">
            {tag ? (
              <span
                className="inline-block w-3.5 h-3.5 rounded-sm"
                style={{ backgroundColor: tag.color }}
                aria-hidden
              />
            ) : null}
            <h2 className="text-xl font-semibold leading-tight truncate">
              {course.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {tag ? (
              <Chip
                className="text-white"
                size="sm"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </Chip>
            ) : null}
            <span className="text-xs text-default-500">Phase {phaseLabel}</span>
          </div>
        </CardBody>
      </Card>
      <QuizRunner course={course} onFinish={onFinish} />
      <div className="flex justify-end">
        <Button variant="light" onPress={() => router.push("/dashboard")}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
