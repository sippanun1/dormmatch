"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Building } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BuildingDialog({
  onCreated,
}: {
  onCreated: (building: Building) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [electricityRate, setElectricityRate] = useState("8");
  const [waterRate, setWaterRate] = useState("18");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { building } = await api<{ building: Building }>("/api/buildings", {
        method: "POST",
        body: {
          name,
          address,
          description: description || undefined,
          electricity_rate: parseFloat(electricityRate),
          water_rate: parseFloat(waterRate),
        },
      });
      setOpen(false);
      setName("");
      setAddress("");
      setDescription("");
      onCreated(building);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          {t("buildingForm.addBuilding")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("buildingForm.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="b_name">{t("buildingForm.name")}</Label>
            <Input
              id="b_name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b_address">{t("buildingForm.address")}</Label>
            <Textarea
              id="b_address"
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b_desc">{t("buildingForm.description")}</Label>
            <Textarea
              id="b_desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="b_elec">
                {t("buildingForm.electricityRate")}
              </Label>
              <Input
                id="b_elec"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={electricityRate}
                onChange={(e) => setElectricityRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b_water">{t("buildingForm.waterRate")}</Label>
              <Input
                id="b_water"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={waterRate}
                onChange={(e) => setWaterRate(e.target.value)}
              />
            </div>
          </div>

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
