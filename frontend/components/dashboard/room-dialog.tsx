"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RoomDialog({
  buildingId,
  onCreated,
}: {
  buildingId: string;
  onCreated: () => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("1");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [hasAc, setHasAc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/rooms", {
        method: "POST",
        body: {
          building_id: buildingId,
          room_number: roomNumber,
          floor: parseInt(floor),
          monthly_price: parseFloat(monthlyPrice),
          size_sqm: sizeSqm ? parseFloat(sizeSqm) : undefined,
          has_ac: hasAc,
        },
      });
      setOpen(false);
      setRoomNumber("");
      setMonthlyPrice("");
      setSizeSqm("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          {t("roomForm.addRoom")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("roomForm.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r_number">{t("roomForm.roomNumber")}</Label>
              <Input
                id="r_number"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r_floor">{t("roomForm.floor")}</Label>
              <Input
                id="r_floor"
                type="number"
                min="1"
                required
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r_price">{t("roomForm.monthlyPrice")}</Label>
              <Input
                id="r_price"
                type="number"
                min="1"
                step="0.01"
                required
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r_size">{t("roomForm.sizeSqm")}</Label>
              <Input
                id="r_size"
                type="number"
                min="1"
                step="0.5"
                value={sizeSqm}
                onChange={(e) => setSizeSqm(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasAc}
              onChange={(e) => setHasAc(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            {t("roomForm.hasAc")}
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
