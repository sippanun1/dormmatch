"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Application, Building, Room } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FloorPlanGrid } from "./floor-plan-grid";
import { PendingApplications } from "./pending-applications";
import { AiInsightCard } from "./ai-insight-card";
import { BuildingDialog } from "./building-dialog";
import { RoomDialog } from "./room-dialog";

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function OwnerDashboard() {
  const t = useTranslations();
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    api<{ buildings: Building[] }>("/api/buildings").then(({ buildings }) => {
      setBuildings(buildings);
      if (buildings.length > 0) setSelectedId(buildings[0].id);
    });
  }, []);

  const refresh = useCallback(() => {
    if (!selectedId) return;
    api<{ rooms: Room[] }>(`/api/rooms?building_id=${selectedId}`).then(
      ({ rooms }) => setRooms(rooms)
    );
    api<{ applications: Application[] }>(
      "/api/applications?status=pending"
    ).then(({ applications }) =>
      setApplications(
        applications.filter((a) => a.rooms?.buildings?.id === selectedId)
      )
    );
  }, [selectedId]);

  useEffect(refresh, [refresh]);

  if (buildings === null) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {t("common.loading")}
      </p>
    );
  }

  if (buildings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="font-medium">{t("dashboard.noBuildings")}</p>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.noBuildingsHint")}
          </p>
          <BuildingDialog
            onCreated={(b) => {
              setBuildings([b, ...buildings]);
              setSelectedId(b.id);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const available = rooms.filter((r) => r.status === "available").length;
  const occupancyRate =
    rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedId ?? undefined}
          onValueChange={(v) => setSelectedId(v)}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder={t("dashboard.selectBuilding")} />
          </SelectTrigger>
          <SelectContent>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          {selectedId && (
            <RoomDialog buildingId={selectedId} onCreated={refresh} />
          )}
          <BuildingDialog
            onCreated={(b) => {
              setBuildings([b, ...buildings]);
              setSelectedId(b.id);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label={t("dashboard.metrics.totalRooms")}
          value={String(rooms.length)}
        />
        <MetricCard
          label={t("dashboard.metrics.occupancyRate")}
          value={`${occupancyRate}%`}
        />
        <MetricCard
          label={t("dashboard.metrics.available")}
          value={String(available)}
        />
        <MetricCard
          label={t("dashboard.metrics.pendingApplications")}
          value={String(applications.length)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FloorPlanGrid rooms={rooms} />
        </div>
        <div className="space-y-6">
          <AiInsightCard />
          <PendingApplications
            applications={applications}
            onChanged={refresh}
          />
        </div>
      </div>
    </div>
  );
}
