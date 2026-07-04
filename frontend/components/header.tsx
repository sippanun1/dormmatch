"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const t = useTranslations();
  const { user, logout } = useAuth();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="text-lg font-bold text-primary">
            {t("common.appName")}
          </Link>
          <nav className="flex items-center gap-3 text-sm sm:gap-4">
            <Link
              href="/rooms"
              className="text-muted-foreground hover:text-foreground"
            >
              {t("nav.browse")}
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground"
              >
                {t("nav.dashboard")}
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <Badge variant="secondary">{t(`roles.${user.role}`)}</Badge>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.name}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                {t("nav.logout")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">{t("nav.register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
