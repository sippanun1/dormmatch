"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Building, Room } from "@/lib/types";
import { Header } from "@/components/header";
import { RoomCard } from "@/components/rooms/room-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export default function BrowseRoomsPage() {
  const t = useTranslations();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [search, setSearch] = useState("");
  const [buildingId, setBuildingId] = useState(ALL);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [acOnly, setAcOnly] = useState(false);

  useEffect(() => {
    api<{ buildings: Building[] }>("/api/buildings").then(({ buildings }) =>
      setBuildings(buildings)
    );
  }, []);

  // API-side filters, debounced so price typing doesn't fire per keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (buildingId !== ALL) params.set("building_id", buildingId);
      if (acOnly) params.set("has_ac", "true");
      if (minPrice) params.set("min_price", minPrice);
      if (maxPrice) params.set("max_price", maxPrice);
      const qs = params.toString();
      api<{ rooms: Room[] }>(`/api/rooms${qs ? `?${qs}` : ""}`).then(
        ({ rooms }) => setRooms(rooms)
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [buildingId, acOnly, minPrice, maxPrice]);

  // Text search is client-side (no text search on the API)
  const visibleRooms = useMemo(() => {
    if (!rooms) return null;
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      [r.room_number, r.buildings?.name, r.buildings?.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rooms, search]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("browse.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("browse.subtitle")}
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("browse.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={buildingId} onValueChange={setBuildingId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("browse.allBuildings")}</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="0"
            placeholder={t("browse.minPrice")}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <Input
            type="number"
            min="0"
            placeholder={t("browse.maxPrice")}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={acOnly}
              onChange={(e) => setAcOnly(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            {t("browse.acOnly")}
          </label>
          {visibleRooms && (
            <p className="text-sm text-muted-foreground">
              {t("browse.results", { count: visibleRooms.length })}
            </p>
          )}
        </div>

        {visibleRooms === null ? (
          <p className="py-12 text-center text-muted-foreground">
            {t("common.loading")}
          </p>
        ) : visibleRooms.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {t("browse.noResults")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
