"use client";
import { useState } from "react";
import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";
import { subscribeToPush } from "@/lib/push";

export function EnablePush() {
  const [loading, setLoading] = useState(false);

  async function onEnable() {
    try {
      setLoading(true);
      await subscribeToPush();
      addToast({ title: "Notifications activées", color: "success" });
    } catch (e: any) {
      addToast({ title: e?.message || "Échec de l’activation", color: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" color="primary" isLoading={loading} onPress={onEnable}>
      Activer les notifications
    </Button>
  );
}

