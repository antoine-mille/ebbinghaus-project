// Convert a Base64URL public VAPID key string into a Uint8Array suitable
// for PushManager.subscribe(applicationServerKey).
export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData =
    typeof window === "undefined"
      ? Buffer.from(base64, "base64").toString("binary")
      : atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Request notification permission and ensure a PushSubscription exists for
// the current Service Worker registration. This function does not persist
// the subscription server-side because our scheduling flow embeds the
// subscription directly in each scheduled job body.
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator))
    throw new Error("Service worker not supported");
  if (!("PushManager" in window)) throw new Error("Push API not supported");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permission denied");

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!pubKey) throw new Error("Missing VAPID public key");
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(pubKey),
  });
  return sub;
}
