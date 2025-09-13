"use client";
import { useState } from "react";
import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";
import { subscribeToPush } from "@/lib/push";

export function SendTestPush() {
  const [loading, setLoading] = useState(false);

  async function onSend() {
    try {
      setLoading(true);
      let sub: PushSubscription | null = null;
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        sub = await reg.pushManager.getSubscription();
      }
      if (!sub) {
        sub = await subscribeToPush();
      }
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Rappel de révision",
          body: "Une révision vous attend !",
          url: "/dashboard",
          subscription: sub ? sub.toJSON() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const ok = Number(data?.ok ?? 0);
      const ko = Number(data?.ko ?? 0);
      addToast({ title: `Envoyées: ${ok} • Échecs: ${ko}`, color: "success" });
    } catch (e: any) {
      addToast({ title: e?.message || "Échec de l’envoi", color: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" variant="bordered" isLoading={loading} onPress={onSend}>
      Envoyer une notification test
    </Button>
  );
}
