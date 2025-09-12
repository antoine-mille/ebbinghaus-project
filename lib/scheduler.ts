import { Outcome } from "@/types/schemas";

const day = 24 * 60 * 60 * 1000;
export const intervalsDays = [1, 3, 7, 14, 30, 60];
export const intervalsMs = intervalsDays.map((d) => d * day);

export function scheduleNext(params: {
  level: number;
  outcome: Outcome;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  // Success advances one level; fail repeats the same level (no regression)
  const delta = params.outcome === "success" ? 1 : 0;
  const nextLevel = Math.max(0, Math.min(params.level + delta, intervalsMs.length - 1));
  const nextDate = new Date(now.getTime() + intervalsMs[nextLevel]);
  return { nextLevel, nextDate };
}

export function initialNextDate(now = new Date()) {
  return new Date(now.getTime() + intervalsMs[0]);
}
