import { HeartHandshake, MessageCircleHeart, Sunrise } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import {
  getPrayerFeed,
  getReflections,
  getTodayDevotion,
  getViewerCompletion,
} from "@/app/lib/db/queries";
import { createT, localize } from "@/app/lib/i18n";
import { formatFullDate } from "@/app/lib/utils";
import { PrayerCard } from "@/app/components/member/PrayerCard";
import { ReflectionCard } from "@/app/components/member/ReflectionCard";
import { ReflectionComposer } from "@/app/components/member/ReflectionComposer";
import { TodayActions } from "@/app/components/member/TodayActions";
import { fmt, resolveRoleLabels } from "@/app/lib/roleLabels";
import {
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  ScriptureBlock,
  SectionHeading,
} from "@/app/components/ui";

export default async function TodayPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");
  const rl = resolveRoleLabels(church, locale as "ja" | "en");

  // 4クエリを並列化（completion のみ devotion に依存するため then で連結）。
  const devotionP = getTodayDevotion(supabase, church);
  const [devotion, completion, prayersAll, reflections] = await Promise.all([
    devotionP,
    devotionP.then((d) => (d ? getViewerCompletion(supabase, d.id) : null)),
    getPrayerFeed(supabase, viewer, locale as "ja" | "en"),
    getReflections(supabase, viewer, locale as "ja" | "en", 3),
  ]);
  const prayers = prayersAll.slice(0, 3);
  const todayLabel = formatFullDate(new Date().toISOString(), locale as "ja" | "en", church.timezone);
  const shareHref = `/${locale}/church/${church.slug}/prayers/new`;

  const prayerPreview = (
    <section className="space-y-3">
      <SectionHeading
        title={t("today.churchPrayers")}
        right={
          <ButtonLink href={`/${locale}/church/${church.slug}/prayers`} variant="quiet" size="sm">
            {t("common.continue")}
          </ButtonLink>
        }
      />
      {prayers.length === 0 ? (
        <EmptyState icon={HeartHandshake} title={fmt(t("prayer.empty"), { pastor: rl.pastor })} />
      ) : (
        prayers.map((vm) => <PrayerCard key={vm.item.id} vm={vm} church={church} locale={locale as "ja" | "en"} />)
      )}
    </section>
  );

  return (
    <>
      <p className="mb-3 flex items-center gap-1.5 text-sm text-muted">
        <Sunrise className="h-4 w-4 text-gold-ink" aria-hidden />
        {todayLabel}
      </p>

      {!devotion ? (
        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-2 text-center">
              <h1 className="text-base font-semibold text-ink text-balance-safe">{t("today.notPublishedTitle")}</h1>
              <p className="text-sm text-muted text-balance-safe">{t("today.notPublishedBody")}</p>
              <div className="pt-1">
                <ButtonLink href={shareHref} variant="secondary" size="sm">
                  <MessageCircleHeart className="h-4 w-4" aria-hidden />
                  {fmt(t("today.talkToPastor"), { pastor: rl.pastor })}
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
          {prayerPreview}
        </div>
      ) : (
        <div className="space-y-5">
          <ScriptureBlock
            reference={devotion.scriptureReference}
            translation={devotion.scriptureTranslation}
            quote={localize(devotion.scriptureQuote, locale as "ja" | "en", church.defaultLocale)}
            copyrightNotice={devotion.copyrightNotice}
          />

          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-sage-ink">{fmt(t("today.pastorNote"), { pastor: rl.pastor })}</p>
            <h1 className="text-xl font-semibold text-ink text-balance-safe">
              {localize(devotion.title, locale as "ja" | "en", church.defaultLocale)}
            </h1>
            <p className="whitespace-pre-line leading-relaxed text-ink-soft text-balance-safe">
              {localize(devotion.body, locale as "ja" | "en", church.defaultLocale)}
            </p>
          </section>

          {localize(devotion.reflectionQuestion, locale as "ja" | "en", church.defaultLocale) ? (
            <Card>
              <CardBody>
                <p className="text-xs font-medium uppercase tracking-wide text-sage-ink">{t("today.reflection")}</p>
                <p className="mt-1.5 text-base text-ink text-balance-safe">
                  {localize(devotion.reflectionQuestion, locale as "ja" | "en", church.defaultLocale)}
                </p>
              </CardBody>
            </Card>
          ) : null}

          {localize(devotion.prayerGuide, locale as "ja" | "en", church.defaultLocale) ? (
            <div className="rounded-2xl border border-gold/25 bg-gold-soft/40 p-5">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gold-ink">
                <HeartHandshake className="h-3.5 w-3.5" aria-hidden />
                {t("today.guidedPrayer")}
              </p>
              <p className="font-scripture mt-1.5 text-base leading-relaxed text-ink text-balance-safe">
                {localize(devotion.prayerGuide, locale as "ja" | "en", church.defaultLocale)}
              </p>
            </div>
          ) : null}

          <TodayActions
            talkToPastorLabel={fmt(t("today.talkToPastor"), { pastor: rl.pastor })}
            churchId={church.id}
            contentId={devotion.id}
            initialRead={completion?.read ?? false}
            initialPrayed={completion?.prayed ?? false}
            shareHref={shareHref}
          />

          <div className="flex items-center gap-3 pt-2">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">{t("today.softGate.gentle")}</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <SectionHeading eyebrow={t("today.afterTitle")} title={t("today.yourReflection")} />
          <ReflectionComposer churchId={church.id} churchSlug={church.slug} />

          {prayerPreview}

          {reflections.length > 0 ? (
            <section className="space-y-3">
              <SectionHeading title={t("today.recentReflections")} />
              {reflections.map((vm) => (
                <ReflectionCard key={vm.item.id} vm={vm} church={church} locale={locale as "ja" | "en"} />
              ))}
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
