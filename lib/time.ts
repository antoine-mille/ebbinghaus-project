export function formatRelativeToNow(target: Date, now = new Date()) {
  const diffMs = target.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const minute = 60 * 1000;

  const inPast = diffMs < 0;

  const plural = (n: number, s: string, p?: string) => (n === 1 ? s : p ?? `${s}s`);

  let value: number;
  let unit: string;

  if (abs < minute) {
    value = Math.round(abs / 1000);
    unit = plural(value, "seconde");
  } else if (abs < hour) {
    value = Math.round(abs / minute);
    unit = plural(value, "minute");
  } else if (abs < day) {
    value = Math.round(abs / hour);
    unit = plural(value, "heure");
  } else if (abs < day * 14) {
    value = Math.round(abs / day);
    unit = plural(value, "jour");
  } else if (abs < day * 60) {
    value = Math.round(abs / (7 * day));
    unit = plural(value, "semaine");
  } else {
    value = Math.round(abs / (30 * day));
    unit = plural(value, "mois");
  }

  return inPast ? `il y a ${value} ${unit}` : `dans ${value} ${unit}`;
}

