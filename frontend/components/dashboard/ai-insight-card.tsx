"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AiInsightCard() {
  const t = useTranslations();

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-violet-500" />
          {t("dashboard.aiInsight")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.aiComingSoon")}
        </p>
      </CardContent>
    </Card>
  );
}
