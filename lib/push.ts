export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window === 'undefined' ? Buffer.from(base64, 'base64').toString('binary') : atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) throw new Error('Service worker non supporté');
  if (!('PushManager' in window)) throw new Error('Push API non supportée');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission refusée');

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!pubKey) throw new Error('VAPID public key manquante');
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(pubKey),
  });
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(sub),
  });
  return sub;
}

