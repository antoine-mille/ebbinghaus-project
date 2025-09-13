// Receives scheduled calls (via Upstash QStash) to send a push notification.
// - Checks a per-day "done" flag in Redis to avoid duplicate reminders.
// - Builds a French, fun message randomly and sends Web Push using VAPID.
// Env: UPSTASH_REDIS_REST_URL/_TOKEN, VAPID_PUBLIC_KEY/_PRIVATE_KEY, VAPID_CONTACT
import { NextResponse } from "next/server";
import webpush from "web-push";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL as string | undefined;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN as string | undefined;

async function redis(path: string) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Redis not configured");
  const res = await fetch(`${REDIS_URL}${path}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

function ensureConfig() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT;
  if (!pub || !priv || !contact) throw new Error("Missing VAPID env vars");
  webpush.setVapidDetails(contact, pub, priv);
}

// Pool of short, funny French messages. `${name}` placeholder is replaced
// with the course name when provided.
const FUN_MESSAGES_FR = [
  "Petit rappel: on révise ${name} et ensuite câlin.",
  "Hey toi, ${name} t'attend. Promis, c'est rapide !",
  "Mission du jour: ${name}. Récompense: un bisous.",
  "Et si on brillait sur ${name} aujourd’hui ?",
  "3…2…1… révision ${name} et fierté au max !",
  "On fait équipe ? ${name} n’a qu’à bien se tenir.",
  "Minute douceur, minute ${name}. Let's go !",
  "Ta version du futur te dit merci pour ${name}.",
  "On révise ${name} et on fête ça après !",
  "Chuchotement: ${name}, maintenant, avec amour.",
];

function pickMessage(name?: string | null) {
  const i = Math.floor(Math.random() * FUN_MESSAGES_FR.length);
  const raw = FUN_MESSAGES_FR[i];
  if (!name) return raw.replaceAll("${name}", "le cours");
  return raw.replaceAll("${name}", name);
}

export async function POST(req: Request) {
  try {
    ensureConfig();
    const body = await req.json();
    const { subscription, courseId, courseName, dateKey } = body || {};
    if (!subscription?.endpoint || !courseId || !dateKey) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    const doneKey = `push:done:${dateKey}`;
    const member = encodeURIComponent(`${subscription.endpoint}::${courseId}`);
    // Check if already completed today for this device+course
    const doneRes = await redis(
      `/sismember/${encodeURIComponent(doneKey)}/${member}`
    );
    const isDone = doneRes?.result === 1;
    if (isDone) return NextResponse.json({ ok: true, skipped: true });

    const payload = JSON.stringify({
      title: "Rappel de révision",
      body: pickMessage(courseName ?? undefined),
      url: "/dashboard",
    });
    await webpush.sendNotification(subscription as any, payload);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
