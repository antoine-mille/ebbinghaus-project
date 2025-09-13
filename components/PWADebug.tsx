"use client";
import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { addToast } from "@heroui/toast";
import { subscribeToPush } from "@/lib/push";

type SWInfo = {
  supported: boolean;
  hasController: boolean;
  state: string | null;
  scriptURL: string | null;
};

type PushInfo = {
  supported: boolean;
  permission: NotificationPermission;
  hasSubscription: boolean;
  endpoint: string | null;
};

export function PWADebug() {
  const [sw, setSw] = useState<SWInfo>({
    supported: typeof window !== "undefined" && "serviceWorker" in navigator,
    hasController: false,
    state: null,
    scriptURL: null,
  });
  const [push, setPush] = useState<PushInfo>({
    supported: typeof window !== "undefined" && "PushManager" in window,
    permission: typeof window !== "undefined" ? Notification.permission : "default",
    hasSubscription: false,
    endpoint: null,
  });

  async function refresh() {
    try {
      const swSupported = "serviceWorker" in navigator;
      const hasController = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.getRegistration();
      setSw({
        supported: swSupported,
        hasController,
        state: reg?.active?.state || reg?.installing?.state || reg?.waiting?.state || null,
        scriptURL: reg?.active?.scriptURL || reg?.installing?.scriptURL || reg?.waiting?.scriptURL || null,
      });
      const pushSupported = "PushManager" in window;
      const permission = Notification.permission;
      let hasSubscription = false;
      let endpoint: string | null = null;
      if (reg && pushSupported) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          hasSubscription = true;
          endpoint = sub.endpoint || null;
        }
      }
      setPush({ supported: pushSupported, permission, hasSubscription, endpoint });
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function showLocalNotification() {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification("Test local", {
        body: "Notification locale via Service Worker",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
      });
      addToast({ title: "Notification locale affichée", color: "success" });
    } catch (e: any) {
      addToast({ title: e?.message || "Impossible d'afficher la notification", color: "danger" });
    }
  }

  async function forceUpdateSW() {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg?.update();
    await refresh();
    addToast({ title: "Service worker mis à jour", color: "success" });
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await refresh();
    addToast({ title: "Désabonné du push", color: "success" });
  }

  async function resubscribe() {
    await subscribeToPush();
    await refresh();
    addToast({ title: "Souscription push active", color: "success" });
  }

  async function sendToCurrentOnly() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) throw new Error("Aucune souscription trouvée");
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Test direct", body: "Cible: cette souscription", subscription: sub.toJSON() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      addToast({ title: `Résultat: ${JSON.stringify(data)}`, color: "success" });
    } catch (e: any) {
      addToast({ title: e?.message || "Échec de l'envoi", color: "danger" });
    }
  }

  const endpointShort = push.endpoint ? push.endpoint.replace(/^https?:\/\//, "").slice(-36) : "—";

  return (
    <Card>
      <CardBody className="grid gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">PWA Debug</span>
          <Chip size="sm" variant="flat" color={sw.supported ? "success" : "danger"}>{sw.supported ? "SW ok" : "SW off"}</Chip>
          <Chip size="sm" variant="flat" color={push.supported ? "success" : "danger"}>{push.supported ? "Push ok" : "Push off"}</Chip>
          <Chip size="sm" variant="flat" color={push.permission === "granted" ? "success" : push.permission === "denied" ? "danger" : "warning"}>{push.permission}</Chip>
        </div>
        <div className="text-xs text-default-500">
          SW: {sw.state || "—"} {sw.scriptURL ? `• ${sw.scriptURL}` : ""}
        </div>
        <div className="text-xs text-default-500">
          Subscription: {push.hasSubscription ? "présente" : "absente"} {push.hasSubscription ? `• …${endpointShort}` : ""}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="flat" onPress={refresh}>Rafraîchir</Button>
          <Button size="sm" variant="flat" onPress={forceUpdateSW}>Maj SW</Button>
          <Button size="sm" variant="flat" onPress={showLocalNotification}>Notif locale</Button>
          {push.hasSubscription ? (
            <Button size="sm" color="danger" variant="bordered" onPress={unsubscribe}>Se désabonner</Button>
          ) : (
            <Button size="sm" color="primary" onPress={resubscribe}>S'abonner</Button>
          )}
          <Button size="sm" onPress={sendToCurrentOnly}>Envoyer à cette souscription</Button>
        </div>
      </CardBody>
    </Card>
  );
}

