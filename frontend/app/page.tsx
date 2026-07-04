import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="max-w-xl text-muted-foreground sm:text-lg">
          {t("landing.heroSubtitle")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/rooms">{t("landing.browseCta")}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/register">{t("landing.ownerCta")}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
