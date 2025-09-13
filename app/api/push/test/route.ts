import { NextResponse } from "next/server";
import webpush from "web-push";
import { getSubscriptions } from "@/lib/pushStore";

function ensureConfig() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT;
  if (!pub || !priv || !contact) throw new Error("VAPID env manquants");
  webpush.setVapidDetails(contact, pub, priv);
}

export async function POST(req: Request) {
  try {
    ensureConfig();
    const body = await req.json().catch(() => ({}));
    const payload = JSON.stringify({
      title: body?.title || "Rappel de révision",
      body: body?.body || "Une révision vous attend !",
      url: body?.url || "/dashboard",
    });
    const stored = await getSubscriptions();
    const fromBody = body?.subscription ? [body.subscription] : [];
    const targets = [...fromBody, ...stored];
    const results = await Promise.allSettled(
      targets.map((s: any) => webpush.sendNotification(s as any, payload))
    );
    const ok = results.filter((r: any) => r.status === "fulfilled").length;
    const ko = results.length - ok;
    return NextResponse.json({ ok, ko });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
