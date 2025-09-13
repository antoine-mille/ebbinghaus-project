"use client";
import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import Link from "next/link";

import { CourseForm } from "@/components/CourseForm";
import { TagManager } from "@/components/TagManager";
import { ReviewCard } from "@/components/ReviewCard";
import { db, listDueCourses, getLatestPlans } from "@/db";
import { formatRelativeToNow } from "@/lib/time";
import { EnablePush } from "@/components/EnablePush";

export default function DashboardPage() {
  const [priority, setPriority] = useState<{
    course: { id: string; name: string; description?: string };
    tag?: { name: string; color: string } | null;
    next?: Date | null;
    status?: "success" | "fail" | null;
  } | null>(null);
  const [due, setDue] = useState<
    {
      course: { id: string; name: string; description?: string };
      tag?: { name: string; color: string } | null;
    }[]
  >([]);

  async function refresh() {
    const dueCourses = await listDueCourses();
    const tags = await db.tags.toArray();
    const plans = await getLatestPlans();
    const courses = await db.courses.toArray();

    const enriched = dueCourses.map((c) => ({
      course: c,
      tag: c.tagId ? (tags.find((t) => t.id === c.tagId) ?? null) : null,
    }));
    setDue(enriched);

    const sortedPlans = [...plans].sort(
      (a, b) =>
        new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()
    );
    const nextPlan = sortedPlans[0];
    if (nextPlan) {
      const course = courses.find((c) => c.id === nextPlan.courseId);
      if (course) {
        setPriority({
          course,
          tag: course.tagId
            ? (tags.find((t) => t.id === course.tagId) ?? null)
            : null,
          next: nextPlan.nextReviewAt,
          status: nextPlan.lastOutcome ?? null,
        });
      } else {
        setPriority(null);
      }
    } else {
      setPriority(null);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="grid gap-5 pb-20">
      <Card>
        <CardBody className="grid gap-2">
          <h2 className="text-xl font-semibold">Prochaine révision</h2>
          {priority ? (
            <>
              <ReviewCard
                course={priority.course}
                tag={priority.tag}
                status={priority.status ?? null}
                onDeleted={refresh}
              />
              {priority.next ? (
                <p className="text-xs text-default-500">
                  {formatRelativeToNow(new Date(priority.next))} • le{" "}
                  {new Date(priority.next).toLocaleDateString("fr-FR")}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-default-500 text-sm">
              Aucun cours planifié pour l’instant.
            </p>
          )}
          <Button
            as={Link}
            href="/courses"
            variant="bordered"
            className="w-full mt-2"
          >
            Voir tous les cours
          </Button>
        </CardBody>
      </Card>

      <div className="grid gap-5">
        <EnablePush />
        <CourseForm onCreated={refresh} />
        <TagManager onChanged={refresh} />
        <Card>
          <CardBody className="grid gap-2">
            <h3 className="text-lg font-semibold">Gestion des QCM</h3>
            <Button
              as={Link}
              href="/dashboard/quizzes"
              className="w-full bg-gradient-to-r from-primary to-violet-600 text-white"
            >
              Voir et créer des QCM IA
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
