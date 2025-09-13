import { subscribeToPush } from "@/lib/push";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function makeDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function scheduleReminders(params: {
  courseId: string;
  courseName: string;
  nextReviewAt: Date;
  times?: string[]; // ["09:00", "12:00", ...]
}) {
  const { courseId, courseName, nextReviewAt } = params;
  const times = params.times ?? ["09:00", "12:00", "18:00"];

  // Ensure push subscription exists
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await subscribeToPush();
  if (!sub) throw new Error("Impossible de s'abonner aux notifications");

  const y = nextReviewAt.getFullYear();
  const m = nextReviewAt.getMonth();
  const d = nextReviewAt.getDate();
  const timestamps: number[] = [];
  for (const t of times) {
    const [hh, mm] = t.split(":").map((s) => parseInt(s, 10));
    const dt = new Date(y, m, d, hh || 0, mm || 0, 0, 0);
    timestamps.push(dt.getTime());
  }

  const dateKey = makeDateKey(nextReviewAt);
  await fetch("/api/push/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      courseId,
      courseName,
      dateKey,
      times: timestamps,
    }),
  });
}

export async function markDayDone(params: { courseId: string; dateKey: string }) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push/done", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), courseId: params.courseId, dateKey: params.dateKey }),
  });
}

