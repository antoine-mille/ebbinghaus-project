"use client";
import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { db } from "@/db";

export function StatsBlocks() {
  const [stats, setStats] = useState({ total: 0, success: 0, fail: 0 });
  const [perCourse, setPerCourse] = useState<{ id: string; name: string; level: number }[]>([]);

  useEffect(() => {
    (async () => {
      const total = await db.reviewEvents.count();
      const success = await db.reviewEvents.where({ outcome: "success" }).count();
      const fail = await db.reviewEvents.where({ outcome: "fail" }).count();
      setStats({ total, success, fail });
      const courses = await db.courses.toArray();
      const plans = await db.reviewPlans.toArray();
      const rows = courses.map((c) => ({ id: c.id, name: c.name, level: plans.find((p) => p.courseId === c.id)?.level ?? 0 }));
      setPerCourse(rows);
    })();
  }, []);

  const rate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  return (
    <div className="grid gap-4">
      <Card>
        <CardBody className="grid gap-2">
          <h3 className="text-lg font-semibold">Progression globale</h3>
          <p className="text-sm text-default-500">{stats.total} révisions au total</p>
          <Progress aria-label="Taux de réussite" value={rate} color="success" />
        </CardBody>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        {perCourse.map((c) => (
          <Card key={c.id}>
            <CardBody>
              <div className="flex items-center justify-between">
                <p className="font-medium">{c.name}</p>
                <span className="text-sm text-default-500">Niveau {c.level}</span>
              </div>
              <Progress aria-label={`Niveau de ${c.name}`} value={((c.level + 1) / 6) * 100} />
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

