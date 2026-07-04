"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Home, MapPin, Snowflake, Sofa } from "lucide-react";
import { Room } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export function RoomCard({ room }: { room: Room }) {
  const t = useTranslations();
  const building = room.buildings;
  const photo = room.photo_urls?.[0];

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex h-40 items-center justify-center bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={room.room_number}
            className="h-full w-full object-cover"
          />
        ) : (
          <Home className="h-10 w-10 text-muted-foreground/40" />
        )}
      </div>

      <CardContent className="flex-1 space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">
              {building?.name} · {room.room_number}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{building?.address}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
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
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <p className="text-lg font-bold">
          ฿{Number(room.monthly_price).toLocaleString()}
          <span className="text-xs font-normal text-muted-foreground">
            {t("common.perMonth")}
          </span>
        </p>
        <Button size="sm" asChild>
          <Link href={`/rooms/${room.id}`}>{t("browse.viewDetails")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
