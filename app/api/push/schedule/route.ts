// Schedules server-side push sends at exact times using Upstash QStash.
// The client passes a concrete PushSubscription; we embed it in each job,
// so there is no server-side subscription storage.
// Env: QSTASH_TOKEN, PUSH_BASE_URL (or VERCEL_URL fallback)
import { NextResponse } from "next/server";
import { qstashPublishAt } from "@/lib/qstash";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, courseId, courseName, dateKey, times } = body || {};
    if (!subscription?.endpoint || !courseId || !dateKey || !Array.isArray(times)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    const baseUrl =
      process.env.PUSH_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined);
    if (!baseUrl) {
      return NextResponse.json({ error: "Missing PUSH_BASE_URL/VERCEL_URL" }, { status: 500 });
    }
    const url = `${baseUrl}/api/push/send`;
    const memberBase = { subscription, courseId, courseName, dateKey };
    let scheduled = 0;
    for (const ts of times as number[]) {
      const at = new Date(ts).toISOString();
      await qstashPublishAt({ url, body: { ...memberBase, ts }, at });
      scheduled++;
    }
    return NextResponse.json({ ok: true, scheduled });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
