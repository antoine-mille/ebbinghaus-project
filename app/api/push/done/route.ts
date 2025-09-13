// Marks the day as completed for a (subscription, course) pair to stop
// further reminders for the same day. Uses a Redis Set per day.
// Env: UPSTASH_REDIS_REST_URL/_TOKEN
import { NextResponse } from "next/server";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(path: string) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Redis not configured");
  const res = await fetch(`${REDIS_URL}${path}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, courseId, dateKey } = body || {};
    if (!subscription?.endpoint || !courseId || !dateKey) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    if (!REDIS_URL || !REDIS_TOKEN)
      return NextResponse.json({ ok: true, note: "redis_disabled" });
    const key = `push:done:${dateKey}`;
    const member = encodeURIComponent(`${subscription.endpoint}::${courseId}`);
    await redis(`/sadd/${encodeURIComponent(key)}/${member}`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
