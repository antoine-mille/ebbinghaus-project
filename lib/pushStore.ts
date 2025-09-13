const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = process.env.UPSTASH_REDIS_KEY || "push:subs";

let memory: any[] = [];

async function redisFetch(path: string) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Upstash Redis non configuré");
  const res = await fetch(`${REDIS_URL}${path}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

export async function addSubscription(sub: any) {
  if (!sub || !sub.endpoint) return;
  if (REDIS_URL && REDIS_TOKEN) {
    const member = encodeURIComponent(JSON.stringify(sub));
    await redisFetch(`/sadd/${encodeURIComponent(REDIS_KEY)}/${member}`);
    return;
  }
  const exists = memory.find((s) => s.endpoint === sub.endpoint);
  if (!exists) memory.push(sub);
}

export async function getSubscriptions() {
  if (REDIS_URL && REDIS_TOKEN) {
    const data = await redisFetch(`/smembers/${encodeURIComponent(REDIS_KEY)}`);
    const arr = Array.isArray(data?.result) ? data.result : [];
    return arr.map((s: string) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
  return memory;
}

export async function countSubscriptions() {
  if (REDIS_URL && REDIS_TOKEN) {
    const data = await redisFetch(`/scard/${encodeURIComponent(REDIS_KEY)}`);
    return Number(data?.result || 0);
  }
  return memory.length;
}
