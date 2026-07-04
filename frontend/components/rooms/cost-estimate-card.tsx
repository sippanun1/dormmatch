"use client";

import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";
import { CostEstimate } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  estimate: CostEstimate | null;
  rent: number;
  loaded: boolean;
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between text-sm ${bold ? "font-bold" : ""}`}
    >
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>฿{value.toLocaleString()}</span>
    </div>
  );
}

export function CostEstimateCard({ estimate, rent, loaded }: Props) {
  const t = useTranslations();

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          {t("roomDetail.trueCost")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!loaded ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : estimate ? (
          <>
            <Row label={t("roomDetail.rent")} value={estimate.rent} />
            <Row
              label={t("roomDetail.electricity")}
              value={estimate.electricity_cost}
            />
            <Row label={t("roomDetail.water")} value={estimate.water_cost} />
            <div className="border-t pt-2">
              <Row label={t("roomDetail.total")} value={estimate.total} bold />
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              {t("roomDetail.trueCostHint", {
                months: estimate.months_of_data,
              })}
            </p>
          </>
        ) : (
          <>
            <Row label={t("roomDetail.rent")} value={rent} />
            <p className="pt-1 text-xs text-muted-foreground">
              {t("roomDetail.noMeterData")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
