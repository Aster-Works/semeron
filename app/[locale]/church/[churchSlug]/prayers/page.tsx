import { HeartHandshake, Plus, Search, X } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getMyPrayerRequests, getPrayerFeed } from "@/app/lib/db/queries";
import type { PrayerVM } from "@/app/lib/db/queries";
import { createT, localize } from "@/app/lib/i18n";
import { PrayerCard } from "@/app/components/member/PrayerCard";
import { Button, ButtonLink, Card, CardBody, EmptyState, Input, SectionHeading } from "@/app/components/ui";
import { fmt, resolveRoleLabels } from "@/app/lib/roleLabels";

function matchesPrayer(vm: PrayerVM, query: string, locale: "ja" | "en", fallbackLocale: "ja" | "en"): boolean {
  if (!query) return true;
  const haystack = [
    localize(vm.item.title, locale, fallbackLocale),
    localize(vm.item.body, locale, fallbackLocale),
    vm.authorName,
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default async function PrayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
  searchParams?: Promise<{ q?: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { q: rawQuery } = (await searchParams) ?? {};
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");
  const rl = resolveRoleLabels(viewer.church, locale as "ja" | "en");
  const query = (rawQuery ?? "").trim().slice(0, 80);
  const hasQuery = query.length > 0;

  const newHref = `/${locale}/church/${church.slug}/prayers/new`;
  const [feed, myRequests] = await Promise.all([
    getPrayerFeed(supabase, viewer, locale as "ja" | "en"),
    getMyPrayerRequests(supabase, viewer, locale as "ja" | "en"),
  ]);
  // 自分の承認待ちの投稿は published フィードに含まれないため、上部に別出しする
  const myPending = myRequests.filter(
    (vm) => vm.item.status !== "published",
  );
  const filteredPending = myPending.filter((vm) =>
    matchesPrayer(vm, query, locale as "ja" | "en", church.defaultLocale),
  );
  const filteredFeed = feed.filter((vm) =>
    matchesPrayer(vm, query, locale as "ja" | "en", church.defaultLocale),
  );
  const hasAnyPrayers = feed.length > 0 || myPending.length > 0;

  return (
    <>
      <div className="space-y-4">
        <SectionHeading
          title={t("prayer.feedTitle")}
          description={t("prayer.feedSubtitle")}
          right={
            <ButtonLink href={newHref} size="sm">
              <Plus className="h-4 w-4" aria-hidden />
              {t("prayer.new")}
            </ButtonLink>
          }
        />

        <Card>
          <CardBody>
            <form action={`/${locale}/church/${church.slug}/prayers`} className="flex flex-wrap gap-2">
              <label htmlFor="prayer-search" className="sr-only">
                {t("prayer.search")}
              </label>
              <div className="min-w-0 flex-1">
                <Input
                  id="prayer-search"
                  name="q"
                  defaultValue={query}
                  placeholder={t("prayer.searchPlaceholder")}
                  maxLength={80}
                />
              </div>
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4" aria-hidden />
                {t("prayer.searchSubmit")}
              </Button>
              {hasQuery ? (
                <ButtonLink href={`/${locale}/church/${church.slug}/prayers`} variant="ghost">
                  <X className="h-4 w-4" aria-hidden />
                  {t("prayer.searchClear")}
                </ButtonLink>
              ) : null}
            </form>
          </CardBody>
        </Card>

        {filteredPending.length > 0 ? (
          <div className="space-y-3">
            {filteredPending.map((vm) => (
              <PrayerCard key={vm.item.id} vm={vm} church={church} locale={locale as "ja" | "en"} />
            ))}
          </div>
        ) : null}

        {!hasAnyPrayers ? (
          <EmptyState
            icon={HeartHandshake}
            title={fmt(t("prayer.empty"), { pastor: rl.pastor })}
            action={
              <ButtonLink href={newHref} variant="secondary" size="sm">
                {t("prayer.new")}
              </ButtonLink>
            }
          />
        ) : hasQuery && filteredFeed.length === 0 && filteredPending.length === 0 ? (
          <EmptyState icon={Search} title={t("prayer.searchEmpty")} />
        ) : (
          <div className="space-y-3">
            {filteredFeed.map((vm) => (
              <PrayerCard key={vm.item.id} vm={vm} church={church} locale={locale as "ja" | "en"} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
