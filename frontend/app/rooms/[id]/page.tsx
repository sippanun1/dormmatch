"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Home, MapPin, Snowflake, Sofa, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { CostEstimate, Room } from "@/lib/types";
import { Header } from "@/components/header";
import { ApplyDialog } from "@/components/rooms/apply-dialog";
import { CostEstimateCard } from "@/components/rooms/cost-estimate-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RoomDetailPage() {
  const t = useTranslations();
  const { id } = useParams<{ id: string }>();

  const [room, setRoom] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [estimateLoaded, setEstimateLoaded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    api<{ room: Room }>(`/api/rooms/${id}`)
      .then(({ room }) => setRoom(room))
      .catch(() => setNotFound(true));
    api<{ estimate: CostEstimate | null }>(`/api/rooms/${id}/cost-estimate`)
      .then(({ estimate }) => setEstimate(estimate))
      .catch(() => setEstimate(null))
      .finally(() => setEstimateLoaded(true));
  }, [id]);

  const building = room?.buildings;
  const photos = room?.photo_urls ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Link
          href="/rooms"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("roomDetail.backToBrowse")}
        </Link>

        {notFound ? (
          <p className="py-16 text-center text-muted-foreground">
            {t("roomDetail.notFound")}
          </p>
        ) : !room ? (
          <p className="py-16 text-center text-muted-foreground">
            {t("common.loading")}
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: photos + details */}
            <div className="space-y-6 lg:col-span-2">
              <div>
                <div className="flex h-64 items-center justify-center overflow-hidden rounded-lg bg-muted sm:h-80">
                  {photos.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photos[photoIndex]}
                      alt={room.room_number}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Home className="h-16 w-16 text-muted-foreground/40" />
                  )}
                </div>
                {photos.length > 1 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {photos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt={`${room.room_number} ${i + 1}`}
                        onClick={() => setPhotoIndex(i)}
                        className={`h-16 w-20 cursor-pointer rounded-md object-cover ${
                          i === photoIndex
                            ? "ring-2 ring-primary"
                            : "opacity-70"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">
                    {building?.name} · {room.room_number}
                  </h1>
                  <Badge
                    variant={
                      room.status === "available" ? "default" : "secondary"
                    }
                  >
                    {t(`roomStatus.${room.status}`)}
                  </Badge>
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {building?.address}
                </p>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t("roomDetail.details")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {t("browse.floorLabel", { floor: room.floor })}
                  </Badge>
                  {room.size_sqm && (
                    <Badge variant="secondary">
                      {t("browse.sizeLabel", { size: room.size_sqm })}
                    </Badge>
                  )}
                  {room.has_ac && (
                    <Badge variant="secondary">
                      <Snowflake className="mr-1 h-3 w-3" />
                      {t("browse.hasAc")}
                    </Badge>
                  )}
                  {room.has_furniture && (
                    <Badge variant="secondary">
                      <Sofa className="mr-1 h-3 w-3" />
                      {t("browse.furnished")}
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {t("roomDetail.deposit", { months: room.deposit_months })}
                  </Badge>
                  <Badge variant="secondary">
                    {t("roomDetail.minContract", {
                      months: room.min_contract_months,
                    })}
                  </Badge>
                </CardContent>
              </Card>

              {building?.facilities && building.facilities.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {t("roomDetail.facilities")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {building.facilities.map((f) => (
                      <Badge key={f} variant="outline">
                        {f}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: price, true cost, apply */}
            <div className="space-y-4">
              <p className="text-3xl font-bold">
                ฿{Number(room.monthly_price).toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">
                  {t("common.perMonth")}
                </span>
              </p>

              <CostEstimateCard
                estimate={estimate}
                rent={Number(room.monthly_price)}
                loaded={estimateLoaded}
              />

              {building?.electricity_rate && building?.water_rate && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3 shrink-0" />
                  {t("roomDetail.rates", {
                    elec: building.electricity_rate,
                    water: building.water_rate,
                  })}
                </p>
              )}

              <ApplyDialog room={room} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
