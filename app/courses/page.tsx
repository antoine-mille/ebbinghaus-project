"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import Link from "next/link";

import { db, getLatestPlans } from "@/db";
import { formatRelativeToNow } from "@/lib/time";
import { ReviewCard } from "@/components/ReviewCard";
import { FilterIcon, CloseIcon } from "@/components/icons";

export default function CoursesPage() {
  const [items, setItems] = useState<
    {
      course: { id: string; name: string; description?: string };
      tag?: { id: string; name: string; color: string } | null;
      next?: Date | null;
      status?: "success" | "fail" | null;
    }[]
  >([]);
  const [tags, setTags] = useState<
    { id: string; name: string; color: string }[]
  >([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tagId, setTagId] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"none" | "near" | "far">("none");
  const [status, setStatus] = useState<"none" | "success" | "fail">("none");

  async function reload() {
    const courses = await db.courses.orderBy("createdAt").reverse().toArray();
    const tagsList = await db.tags.toArray();
    setTags(tagsList);
    const plans = await getLatestPlans();
    const list = courses.map((c) => {
      const p = plans.find((pl) => pl.courseId === c.id);
      return {
        course: c,
        tag: c.tagId ? (tagsList.find((t) => t.id === c.tagId) ?? null) : null,
        next: p?.nextReviewAt ?? null,
        status: p?.lastOutcome ?? null,
      };
    });
    setItems(list);
  }

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const base = items.filter((it) => {
      const okName =
        search.trim().length === 0 ||
        it.course.name.toLowerCase().includes(search.trim().toLowerCase());
      const okTag = !tagId || it.tag?.id === tagId;
      const okStatus = status === "none" || it.status === status;
      return okName && okTag && okStatus;
    });
    const sorted = [...base].sort((a, b) => {
      if (sortOrder === "none") return 0;
      const at = a.next ? new Date(a.next).getTime() : Number.POSITIVE_INFINITY;
      const bt = b.next ? new Date(b.next).getTime() : Number.POSITIVE_INFINITY;
      return sortOrder === "near" ? at - bt : bt - at;
    });
    return sorted;
  }, [items, search, tagId, sortOrder, status]);

  const activeCount =
    (search.trim().length > 0 ? 1 : 0) +
    (tagId ? 1 : 0) +
    (sortOrder !== "none" ? 1 : 0) +
    (status !== "none" ? 1 : 0);
  const clearFilters = () => {
    setSearch("");
    setTagId(undefined);
    setSortOrder("none");
    setStatus("none");
  };

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tous les cours</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            startContent={<FilterIcon />}
            onPress={() => setIsFilterOpen(true)}
          >
            Filtres
          </Button>
          {activeCount > 0 ? (
            <>
              <Chip size="sm" color="primary" variant="flat">
                {activeCount}
              </Chip>
              <Button
                size="sm"
                variant="light"
                startContent={<CloseIcon />}
                onPress={clearFilters}
              >
                Réinitialiser
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <Modal
        isOpen={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Filtrer les cours</ModalHeader>
              <ModalBody className="grid gap-3">
                <Input
                  label="Nom du cours"
                  placeholder="Rechercher par nom"
                  value={search}
                  onValueChange={setSearch}
                />
                <Select
                  label="Tag"
                  selectedKeys={tagId ? [tagId] : []}
                  onSelectionChange={(keys) => {
                    const val = (keys as Set<string>).values().next().value as
                      | string
                      | undefined;
                    setTagId(val);
                  }}
                >
                  {tags.map((t) => (
                    <SelectItem key={t.id} textValue={t.name}>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-4 h-4 rounded-sm"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  label="Statut"
                  selectedKeys={[status]}
                  onSelectionChange={(keys) => {
                    const val = (keys as Set<string>).values().next().value as
                      | "none"
                      | "success"
                      | "fail";
                    setStatus(val ?? "none");
                  }}
                >
                  <SelectItem key="none" textValue="Tous">
                    Tous
                  </SelectItem>
                  <SelectItem key="success" textValue="Réussis">
                    Réussis
                  </SelectItem>
                  <SelectItem key="fail" textValue="Échecs">
                    Échecs
                  </SelectItem>
                </Select>
                <Select
                  label="Date de révision"
                  selectedKeys={[sortOrder]}
                  onSelectionChange={(keys) => {
                    const val = (keys as Set<string>).values().next().value as
                      | "none"
                      | "near"
                      | "far";
                    setSortOrder(val ?? "none");
                  }}
                >
                  <SelectItem key="none" textValue="Toutes">
                    Toutes
                  </SelectItem>
                  <SelectItem key="near" textValue="Les plus proches">
                    Les plus proches
                  </SelectItem>
                  <SelectItem key="far" textValue="Les plus lointaines">
                    Les plus lointaines
                  </SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={clearFilters}>
                  Réinitialiser
                </Button>
                <Button color="primary" onPress={onClose}>
                  Appliquer
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <div className="grid gap-3">
        {filtered.map((it) => (
          <div key={it.course.id} className="grid gap-2">
            <ReviewCard
              course={it.course}
              tag={it.tag}
              status={it.status ?? null}
              onDeleted={reload}
            />
            {it.next ? (
              <p className="text-xs text-default-500">
                Prochaine révision {formatRelativeToNow(new Date(it.next))}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <Button as={Link} href="/dashboard" variant="bordered" className="w-full">
        Retour au tableau de bord
      </Button>
    </div>
  );
}
