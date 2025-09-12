"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { db } from "@/db";

function formatDuration(ms: number) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

function moodFor(pct: number) {
  if (pct >= 80) return "😀";
  if (pct >= 60) return "🙂";
  if (pct >= 40) return "😕";
  return "😞";
}

export function StatsBlocks() {
  const [global, setGlobal] = useState({ total: 0, success: 0, avgDurationMin: 0, validated: 0, totalCourses: 0 });
  const [perCourse, setPerCourse] = useState<
    { id: string; name: string; tag?: { name: string; color: string } | null; successPct: number }[]
  >([]);
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [timeByTag, setTimeByTag] = useState<{ tag?: { name: string; color: string } | null; ms: number }[]>([]);

  useEffect(() => {
    (async () => {
      const courses = await db.courses.toArray();
      const tags = await db.tags.toArray();
      const events = await db.reviewEvents.toArray();
      const plans = await db.reviewPlans.toArray();
      const attempts = await db.quizAttempts.toArray();

      const total = events.length;
      const success = events.filter((e) => e.outcome === "success").length;
      const overallRate = total > 0 ? Math.round((success / total) * 100) : 0;

      // per course success
      const perCourseStats = courses.map((c) => {
        const ev = events.filter((e) => e.courseId === c.id);
        const succ = ev.filter((e) => e.outcome === "success").length;
        const pct = ev.length > 0 ? Math.round((succ / ev.length) * 100) : 0;
        const tag = c.tagId ? tags.find((t) => t.id === c.tagId) ?? null : null;
        return { id: c.id, name: c.name, tag, successPct: pct };
      });
      setPerCourse(perCourseStats);

      // validated vs remaining by lastOutcome in plans
      const latestByCourse = new Map<string, { lastOutcome?: "success" | "fail" }>();
      for (const p of plans) {
        const cur = latestByCourse.get(p.courseId);
        if (!cur || new Date(p.updatedAt).getTime() < new Date(p.updatedAt).getTime()) {
          latestByCourse.set(p.courseId, { lastOutcome: p.lastOutcome });
        } else {
          const curTime = (cur as any).updatedAt ? new Date((cur as any).updatedAt).getTime() : 0;
          const pTime = new Date(p.updatedAt).getTime();
          if (pTime > curTime) latestByCourse.set(p.courseId, { lastOutcome: p.lastOutcome });
        }
      }
      const validated = Array.from(latestByCourse.entries()).filter(([, v]) => v.lastOutcome === "success").length;

      // average duration overall
      const finished = attempts.filter((a) => a.finishedAt);
      const totalMs = finished.reduce((acc, a) => acc + (new Date(a.finishedAt!).getTime() - new Date(a.startedAt).getTime()), 0);
      const avgDurationMin = finished.length > 0 ? Math.round(totalMs / finished.length / 60000) : 0;

      // time by tag
      const timeByCourse = new Map<string, number>();
      for (const a of finished) {
        const ms = new Date(a.finishedAt!).getTime() - new Date(a.startedAt).getTime();
        timeByCourse.set(a.courseId, (timeByCourse.get(a.courseId) ?? 0) + ms);
      }
      const timeByTagAgg = new Map<string | null, number>();
      for (const c of courses) {
        const tagId = c.tagId ?? null;
        const ms = timeByCourse.get(c.id) ?? 0;
        timeByTagAgg.set(tagId, (timeByTagAgg.get(tagId) ?? 0) + ms);
      }
      const timeRows = Array.from(timeByTagAgg.entries()).map(([tid, ms]) => ({
        tag: tid ? tags.find((t) => t.id === tid) ?? null : null,
        ms,
      })).sort((a, b) => b.ms - a.ms);

      setTimeByTag(timeRows);
      setGlobal({ total, success, avgDurationMin, validated, totalCourses: courses.length });
    })();
  }, []);

  const globalRate = global.total > 0 ? Math.round((global.success / global.total) * 100) : 0;
  const sortedPerCourse = useMemo(() => {
    return [...perCourse].sort((a, b) => (order === "asc" ? a.successPct - b.successPct : b.successPct - a.successPct));
  }, [perCourse, order]);

  return (
    <div className="grid gap-4">
      <Card>
        <CardBody className="grid gap-3">
          <h3 className="text-lg font-semibold">Statistiques globales</h3>
          <div className="grid gap-3 text-sm">
            <div>
              <p className="text-default-500">Taux de réussite global</p>
              <div className="flex items-center gap-2">
                <Progress aria-label="Taux de réussite" value={globalRate} className="flex-1" />
                <span className="text-xs">{globalRate}%</span>
                <span aria-hidden>{moodFor(globalRate)}</span>
              </div>
            </div>
            <div>
              <p className="text-default-500">Cours validés</p>
              <p className="font-medium">{global.validated}/{global.totalCourses}</p>
            </div>
            <div>
              <p className="text-default-500">Révisions au total</p>
              <p className="font-medium">{global.total}</p>
            </div>
            <div>
              <p className="text-default-500">Durée moyenne d’une révision</p>
              <p className="font-medium">{global.avgDurationMin} min</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Taux de réussite par cours</h3>
            <Button size="sm" variant="flat" onPress={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}>
              {order === "asc" ? "Ordre : du moins bon" : "Ordre : du meilleur"}
            </Button>
          </div>
          <div className="grid gap-2">
            {sortedPerCourse.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {c.tag ? (
                    <span className="inline-block w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: c.tag.color }} aria-hidden />
                  ) : null}
                  <span className="truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-default-500">{c.successPct}%</span>
                  <span aria-hidden>{moodFor(c.successPct)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-3">
          <h3 className="text-lg font-semibold">Temps passé par matière</h3>
          <div className="grid gap-2">
            {timeByTag.map((row, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {row.tag ? (
                    <Chip className="text-white" size="sm" style={{ backgroundColor: row.tag.color }}>{row.tag.name}</Chip>
                  ) : (
                    <span className="text-xs text-default-500">Sans tag</span>
                  )}
                </div>
                <span className="text-sm">{formatDuration(row.ms)}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
