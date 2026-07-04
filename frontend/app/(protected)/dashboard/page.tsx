"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const t = useTranslations();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t("dashboard.welcome", { name: user.name })}
      </h1>

      {user.role === "tenant" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.title")}</CardTitle>
            <CardDescription>{t("dashboard.tenantComingSoon")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/rooms">{t("nav.browse")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <OwnerDashboard />
      )}
    </div>
  );
}
