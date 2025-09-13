import { NextResponse } from "next/server";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = process.env.UPSTASH_REDIS_QUEUE_KEY || "push:queue";

async function redis(path: string, init?: RequestInit) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Redis non configuré");
  const res = await fetch(`${REDIS_URL}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, courseId, courseName, dateKey, times } = body || {};
    if (!subscription?.endpoint || !courseId || !dateKey || !Array.isArray(times)) {
      return NextResponse.json({ error: "payload invalide" }, { status: 400 });
    }
    if (!REDIS_URL || !REDIS_TOKEN) {
      // Sans Redis, on ne peut pas planifier côté serveur (en local serverless)
      return NextResponse.json({ ok: false, reason: "redis_disabled" }, { status: 501 });
    }
    const memberBase = { subscription, courseId, courseName, dateKey };
    // ZADD par timestamp, membre = JSON
    for (const ts of times as number[]) {
      const member = encodeURIComponent(JSON.stringify({ ...memberBase, ts }));
      await redis(`/zadd/${encodeURIComponent(QUEUE_KEY)}/${ts}/${member}`);
    }
    return NextResponse.json({ ok: true, scheduled: (times as number[]).length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

