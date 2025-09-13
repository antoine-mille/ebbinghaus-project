"use client";
import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { addToast } from "@heroui/toast";

import { db, listQuizCountsMap, addStoredQuiz } from "@/db";
import { quizProvider } from "@/lib/quizProvider";

export default function QuizzesDashboardPage() {
  const [rows, setRows] = useState<
    {
      id: string;
      name: string;
      tag?: { name: string; color: string } | null;
      count: number;
      loading?: boolean;
    }[]
  >([]);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const courses = await db.courses.orderBy("createdAt").reverse().toArray();
    const tags = await db.tags.toArray();
    const counts = await listQuizCountsMap();
    setRows(
      courses.map((c) => ({
        id: c.id,
        name: c.name,
        tag: c.tagId ? (tags.find((t) => t.id === c.tagId) ?? null) : null,
        count: counts.get(c.id) ?? 0,
      }))
    );
  }

  useEffect(() => {
    reload();
  }, []);

  async function createQuiz(course: {
    id: string;
    name: string;
    description?: string;
  }) {
    try {
      setRows((prev) =>
        prev.map((r) => (r.id === course.id ? { ...r, loading: true } : r))
      );
      const q = await quizProvider.generate(course);
      await addStoredQuiz({
        courseId: course.id,
        questions: q.questions,
        source: "AI",
      });
      addToast({
        title: "QCM généré avec succès",
        color: "success",
      });
      await reload();
    } catch (e: any) {
      addToast({
        title: e?.message || "Erreur lors de la génération",
        color: "danger",
      });
    } finally {
      setRows((prev) =>
        prev.map((r) => (r.id === course.id ? { ...r, loading: false } : r))
      );
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-xl font-semibold">QCM par cours</h2>
        <p className="text-default-500 text-sm">Générez des QCM IA pour chaque cours et consultez le nombre de QCM disponibles.</p>
      </div>
      <Card>
        <CardBody className="grid gap-3">
          {rows.length === 0 ? (
            <p className="text-default-500 text-sm">
              Aucun cours enregistré pour le moment.
            </p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {r.tag ? (
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-sm"
                      style={{ backgroundColor: r.tag.color }}
                      title={r.tag.name || "Tag"}
                      aria-label={r.tag.name || "Tag"}
                    />
                  ) : null}
                  <span className="truncate">{r.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Chip variant="flat" color="primary">
                    {r.count} QCM
                  </Chip>
                  <Button
                    disabled={!!r.loading}
                    onPress={() => createQuiz({ id: r.id, name: r.name })}
                    className="bg-gradient-to-r from-primary to-violet-600 text-white flex items-center justify-center gap-2"
                  >
                    {r.loading && <Spinner size="sm" color="white" className="text-white" />}
                    <span>{r.loading ? "Génération…" : "Créer un QCM IA"}</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
