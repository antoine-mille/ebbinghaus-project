const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL as string | undefined;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN as string | undefined;
const REDIS_KEY =
  (process.env.UPSTASH_REDIS_KEY as string | undefined) || "push:subs";

function assertRedis() {
  if (!REDIS_URL || !REDIS_TOKEN)
    throw new Error(
      "Upstash Redis non configuré (UPSTASH_REDIS_REST_URL/_TOKEN)"
    );
}

async function redisFetch(path: string) {
  assertRedis();
  const res = await fetch(`${REDIS_URL}${path}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

export async function addSubscription(sub: any) {
  assertRedis();
  if (!sub || !sub.endpoint) return;
  const member = encodeURIComponent(JSON.stringify(sub));
  await redisFetch(`/sadd/${encodeURIComponent(REDIS_KEY)}/${member}`);
}

export async function getSubscriptions(): Promise<any[]> {
  assertRedis();
  const data = await redisFetch(`/smembers/${encodeURIComponent(REDIS_KEY)}`);
  const arr = Array.isArray(data?.result) ? data.result : [];
  return arr
    .map((s: string) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function countSubscriptions(): Promise<number> {
  assertRedis();
  const data = await redisFetch(`/scard/${encodeURIComponent(REDIS_KEY)}`);
  return Number(data?.result || 0);
}
