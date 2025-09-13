const QSTASH_BASE = process.env.QSTASH_URL || "https://qstash.upstash.io/v2";

function assertQstash() {
  if (!process.env.QSTASH_TOKEN)
    throw new Error("QStash non configuré (QSTASH_TOKEN)");
}

export async function qstashPublishAt(params: {
  url: string;
  body: any;
  at: string; // ISO8601 date string
}) {
  assertQstash();
  const endpoint = `${QSTASH_BASE}/publish/${encodeURIComponent(params.url)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
      "Content-Type": "application/json",
      "Upstash-Schedule-At": params.at,
    },
    body: JSON.stringify(params.body ?? {}),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`QStash ${res.status}: ${text}`);
  }
  try {
    return await res.json();
  } catch {
    return { ok: true } as any;
  }
}
