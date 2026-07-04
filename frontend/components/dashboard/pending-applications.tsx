"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Application } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  applications: Application[];
  onChanged: () => void;
}

export function PendingApplications({ applications, onChanged }: Props) {
  const t = useTranslations();
  const [approving, setApproving] = useState<Application | null>(null);
  const [checkInDate, setCheckInDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (!approving) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/applications/${approving.id}/approve`, {
        method: "PATCH",
        body: { check_in_date: checkInDate },
      });
      setApproving(null);
      onChanged();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(id: string) {
    setBusy(true);
    try {
      await api(`/api/applications/${id}/reject`, { method: "PATCH" });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("dashboard.pendingActions")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {applications.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("dashboard.noPendingApplications")}
          </p>
        )}
        {applications.map((app) => (
          <div key={app.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{app.users?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("applications.room", {
                    room: app.rooms?.room_number ?? "?",
                  })}{" "}
                  ·{" "}
                  {t("applications.appliedAt", {
                    date: new Date(app.applied_at).toLocaleDateString("th-TH"),
                  })}
                </p>
              </div>
            </div>
            {app.message && (
              <p className="mt-2 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                {app.message}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() => setApproving(app)}
              >
                {t("applications.approve")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => handleReject(app.id)}
              >
                {t("applications.reject")}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog
        open={!!approving}
        onOpenChange={(open) => !open && setApproving(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("applications.approveTitle")}</DialogTitle>
            <DialogDescription>
              {t("applications.approveDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="check_in_date">
              {t("applications.checkInDate")}
            </Label>
            <Input
              id="check_in_date"
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setApproving(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button disabled={busy || !checkInDate} onClick={handleApprove}>
              {busy
                ? t("applications.approving")
                : t("applications.confirmApprove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
