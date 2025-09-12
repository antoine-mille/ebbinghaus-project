"use client";
import { StatsBlocks } from "@/components/StatsBlocks";

export default function StatsPage() {
  return (
    <div className="grid gap-6">
      <h2 className="text-xl font-semibold">Statistiques & Progression</h2>
      <StatsBlocks />
    </div>
  );
}
