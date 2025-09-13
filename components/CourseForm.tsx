"use client";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { z } from "zod";

import { addCourse, listTags, upsertInitialPlan } from "@/db/index";
import { CourseSchema } from "@/types/schemas";
import { initialNextDate } from "@/lib/scheduler";
import { scheduleReminders } from "@/lib/scheduleClient";

const FormSchema = CourseSchema.pick({
  name: true,
  description: true,
  tagId: true,
});

export function CourseForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagId, setTagId] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<
    { id: string; name: string; color: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTags().then((t) => setTags(t));
  }, []);

  const isValid = useMemo(() => {
    const res = FormSchema.safeParse({
      name,
      description: description || undefined,
      tagId,
    });
    return res.success;
  }, [name, description, tagId]);

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const parsed = FormSchema.parse({
        name,
        description: description || undefined,
        tagId,
      });
      const course = await addCourse(parsed);
      const next = initialNextDate();
      await upsertInitialPlan(course.id, next);
      try {
        await scheduleReminders({ courseId: course.id, courseName: course.name, nextReviewAt: next });
      } catch {}
      setName("");
      setDescription("");
      setTagId(undefined);
      onCreated?.();
    } catch (e: any) {
      const msg =
        e instanceof z.ZodError
          ? e.issues.map((i) => i.message).join(", ")
          : e?.message || "Erreur";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardBody className="grid gap-5">
        <div className="grid gap-1">
          <h3 className="text-lg font-semibold">Ajouter un cours</h3>
          <p className="text-default-500 text-sm">
            Renseignez le nom, une courte description et un tag matière.
          </p>
        </div>

        <div className="grid gap-3">
          <Input
            label="Nom du cours"
            value={name}
            onValueChange={setName}
            isRequired
            placeholder="Ex. Fractions et opérations"
          />
          <Input
            label="Description courte"
            value={description}
            onValueChange={setDescription}
            placeholder="Quelques mots sur le contenu du cours"
          />
          <Select
            label="Tag (matière) — optionnel"
            placeholder={
              tags.length ? "Choisir un tag" : "Aucun tag disponible"
            }
            isDisabled={tags.length === 0}
            selectedKeys={tagId ? [tagId] : []}
            onSelectionChange={(keys) => {
              const val = (keys as Set<string>).values().next().value as
                | string
                | undefined;
              setTagId(val);
            }}
          >
            {tags.map((t) => (
              <SelectItem key={t.id} textValue={t.name}>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded-sm"
                    style={{ backgroundColor: t.color }}
                  />
                  {t.name}
                </div>
              </SelectItem>
            ))}
          </Select>
          {tags.length === 0 ? (
            <p className="text-default-500 text-xs">
              Astuce: créez d’abord des tags dans la section “Tags”.
            </p>
          ) : null}
        </div>

        {error ? <p className="text-danger text-sm">{error}</p> : null}
        <Button
          className="w-full"
          isDisabled={!isValid || submitting}
          color="primary"
          onPress={onSubmit}
        >
          {submitting ? "Ajout en cours…" : "Ajouter le cours"}
        </Button>
      </CardBody>
    </Card>
  );
}
