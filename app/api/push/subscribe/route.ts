import { NextResponse } from "next/server";
import { addSubscription, countSubscriptions } from "@/lib/pushStore";

export async function POST(req: Request) {
  try {
    const sub = (await req.json()) as any;
    if (!sub || !sub.endpoint)
      return NextResponse.json({ ok: false }, { status: 400 });
    addSubscription(sub);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ count: countSubscriptions() });
}
