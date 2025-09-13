"use client";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { deleteCourseCascade } from "@/db";
import Link from "next/link";

export function ReviewCard({
  course,
  tag,
  status,
  onDeleted,
}: {
  course: { id: string; name: string; description?: string };
  tag?: { name: string; color: string } | null;
  status?: "success" | "fail" | null;
  onDeleted?: () => void;
}) {
  async function handleDelete() {
    const ok =
      typeof window !== "undefined"
        ? window.confirm(`Supprimer le cours "${course.name}" ?`)
        : false;
    if (!ok) return;
    await deleteCourseCascade(course.id);
    onDeleted?.();
  }
  return (
    <Card>
      <CardBody className="relative grid gap-1 py-3 pr-20 group">
        <div className="flex items-center gap-2">
          {tag ? (
            <span
              className="inline-block w-3.5 h-3.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: tag.color }}
              aria-hidden
            />
          ) : null}
          <h4 className="font-semibold text-base leading-tight truncate">
            {course.name}
          </h4>
          {status ? (
            <Chip
              size="sm"
              variant="flat"
              color={status === "success" ? "success" : "danger"}
            >
              {status === "success" ? "Réussi" : "Échec"}
            </Chip>
          ) : null}
        </div>
        {course.description ? (
          <p className="text-sm text-default-500 truncate">
            {course.description}
          </p>
        ) : tag ? (
          <p className="text-xs text-default-500">{tag.name}</p>
        ) : null}

        <div className="hidden group-hover:flex group-focus-within:flex absolute right-2 top-1/2 -translate-y-1/2 gap-2">
          <Button
            size="sm"
            color="danger"
            variant="solid"
            onPress={handleDelete}
          >
            Supprimer
          </Button>
          <Button
            as={Link}
            href={`/revision/${course.id}`}
            size="sm"
            color="primary"
          >
            Lancer le quiz
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
