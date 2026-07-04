"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Room } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ApplyDialog({ room }: { room: Room }) {
  const t = useTranslations();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  if (room.status !== "available") {
    return (
      <Button size="lg" className="w-full" disabled>
        {t("roomDetail.notAvailable")}
      </Button>
    );
  }

  // Owners manage rooms; they don't apply
  if (user?.role === "owner" || user?.role === "platform_admin") {
    return null;
  }

  if (!user) {
    return (
      <Button size="lg" className="w-full" asChild>
        <Link href="/login">{t("roomDetail.loginToApply")}</Link>
      </Button>
    );
  }

  if (applied) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {t("roomDetail.applySuccess")}
      </div>
    );
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/applications", {
        method: "POST",
        body: { room_id: room.id, message: message || undefined },
      });
      setOpen(false);
      setApplied(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? t("roomDetail.applyConflict")
          : t("common.error")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          {t("roomDetail.apply")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("roomDetail.applyTitle", { room: room.room_number })}
          </DialogTitle>
          <DialogDescription>{t("roomDetail.applyDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="apply_message">{t("roomDetail.message")}</Label>
          <Textarea
            id="apply_message"
            rows={3}
            placeholder={t("roomDetail.messagePlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button disabled={busy} onClick={handleSubmit}>
            {busy
              ? t("roomDetail.submitting")
              : t("roomDetail.submitApplication")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
