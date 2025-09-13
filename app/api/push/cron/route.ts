import { NextResponse } from "next/server";
import webpush from "web-push";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = process.env.UPSTASH_REDIS_QUEUE_KEY || "push:queue";

async function redis(path: string, init?: RequestInit) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Redis non configuré");
  const res = await fetch(`${REDIS_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${REDIS_TOKEN}`,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

function ensureConfig() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT;
  if (!pub || !priv || !contact) throw new Error("VAPID env manquants");
  webpush.setVapidDetails(contact, pub, priv);
}

async function runCron() {
  if (!REDIS_URL || !REDIS_TOKEN)
    return NextResponse.json(
      { ok: false, reason: "redis_disabled" },
      { status: 501 }
    );
  ensureConfig();
  const now = Date.now();
  const range = await redis(
    `/zrangebyscore/${encodeURIComponent(QUEUE_KEY)}/-inf/${now}`
  );
  const items: string[] = Array.isArray(range?.result) ? range.result : [];
  let sent = 0;
  for (const raw of items) {
    try {
      const evt = JSON.parse(raw);
      const { subscription, courseName, dateKey } = evt || {};
      const doneKey = `push:done:${dateKey}`;
      const member = encodeURIComponent(
        `${subscription?.endpoint}::${evt.courseId}`
      );
      const done = await redis(
        `/sismember/${encodeURIComponent(doneKey)}/${member}`
      );
      const isDone = done?.result === 1;
      await redis(
        `/zrem/${encodeURIComponent(QUEUE_KEY)}/${encodeURIComponent(raw)}`
      );
      if (isDone) continue;
      const payload = JSON.stringify({
        title: "Rappel de révision",
        body: courseName
          ? `C'est le moment pour: ${courseName}`
          : "C'est l'heure de réviser",
        url: "/dashboard",
      });
      await webpush.sendNotification(subscription as any, payload);
      sent++;
    } catch {
      // ignore per-item error
    }
  }
  return NextResponse.json({ ok: true, sent, due: items.length });
}

function isAuthorized(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // si non défini, ne bloque pas (dev)
  const h =
    req.headers.get("authorization") || req.headers.get("Authorization");
  return h === `Bearer ${expected}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return runCron();
}

export async function GET(req: Request) {
  if (!isAuthorized(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return runCron();
}
