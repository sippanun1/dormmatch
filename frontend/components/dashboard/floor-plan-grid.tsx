"use client";

import { useTranslations } from "next-intl";
import { Room, RoomStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statusStyles: Record<RoomStatus, string> = {
  available: "border-emerald-300 bg-emerald-50 text-emerald-800",
  occupied: "border-sky-300 bg-sky-50 text-sky-800",
  maintenance: "border-amber-300 bg-amber-50 text-amber-800",
  unavailable: "border-zinc-300 bg-zinc-100 text-zinc-500",
};

const statusDots: Record<RoomStatus, string> = {
  available: "bg-emerald-500",
  occupied: "bg-sky-500",
  maintenance: "bg-amber-500",
  unavailable: "bg-zinc-400",
};

export function FloorPlanGrid({ rooms }: { rooms: Room[] }) {
  const t = useTranslations();

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort(
    (a, b) => b - a
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("dashboard.floorPlan")}</CardTitle>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(Object.keys(statusDots) as RoomStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", statusDots[s])} />
                {t(`roomStatus.${s}`)}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rooms.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("dashboard.noRooms")}
          </p>
        )}
        {floors.map((floor) => (
          <div key={floor}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t("dashboard.floor", { floor })}
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {rooms
                .filter((r) => r.floor === floor)
                .sort((a, b) => a.room_number.localeCompare(b.room_number))
                .map((room) => (
                  <div
                    key={room.id}
                    title={`${room.room_number} — ${t(`roomStatus.${room.status}`)} — ฿${Number(room.monthly_price).toLocaleString()}`}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-md border px-1 py-2 text-center",
                      statusStyles[room.status]
                    )}
                  >
                    <span className="text-sm font-semibold">
                      {room.room_number}
                    </span>
                    <span className="text-[10px] leading-tight">
                      {t(`roomStatus.${room.status}`)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
