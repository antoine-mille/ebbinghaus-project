"use client";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { z } from "zod";

import { addTag, listTags } from "@/db/index";
import { PresetTagColors } from "@/types/schemas";

const schema = z.object({ name: z.string().min(1), color: z.string() });

export function TagManager({ onChanged }: { onChanged?: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PresetTagColors[0]);
  const [tags, setTags] = useState<
    { id: string; name: string; color: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const t = await listTags();
    setTags(t);
  }

  useEffect(() => {
    refresh();
  }, []);

  const valid = useMemo(
    () => schema.safeParse({ name, color }).success,
    [name, color]
  );

  async function onAdd() {
    setLoading(true);
    try {
      await addTag({ name, color });
      setName("");
      setColor(PresetTagColors[0]);
      await refresh();
      onChanged?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardBody className="grid gap-5">
        <div className="grid gap-1">
          <h3 className="text-lg font-semibold">Tags</h3>
          <p className="text-default-500 text-sm">
            Organisez vos cours par matière et appliquez un code couleur.
          </p>
        </div>

        <div className="grid gap-3">
          <Input
            label="Nom du tag"
            placeholder="Ex. Français, Mathématiques, Sciences…"
            value={name}
            onValueChange={setName}
          />
          <Select
            label="Couleur"
            selectedKeys={[color]}
            onSelectionChange={(keys) => {
              const val = (keys as Set<string>).values().next().value as string;
              setColor(val);
            }}
          >
            {PresetTagColors.map((c) => (
              <SelectItem key={c} textValue={c}>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded-sm"
                    style={{ backgroundColor: c }}
                  />
                  {c}
                </div>
              </SelectItem>
            ))}
          </Select>
          <Button
            color="primary"
            isDisabled={!valid || loading}
            onPress={onAdd}
          >
            Ajouter le tag
          </Button>
        </div>

        <div className="grid gap-2">
          {tags.length === 0 ? (
            <p className="text-default-500 text-sm">
              Aucun tag créé pour le moment.
            </p>
          ) : (
            tags.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2 rounded-medium border-small border-default-200"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded-sm"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
}
