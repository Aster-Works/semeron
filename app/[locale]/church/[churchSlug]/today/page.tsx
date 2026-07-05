import { HeartHandshake } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import {
  getReflections,
  getTodayDevotion,
  getTodayPrayerSet,
  getViewerCompletion,
} from "@/app/lib/db/queries";
import { toDateKey } from "@/app/lib/demo/selectors";
import { createT } from "@/app/lib/i18n";
import { TodayDevotionFlow } from "@/app/components/member/TodayDevotionFlow";
import { TodayPrayerPreviewFlow } from "@/app/components/member/TodayPrayerPreviewFlow";
import { TodayPrayerCarousel } from "@/app/components/member/TodayPrayerCarousel";
import { fmt, resolveRoleLabels } from "@/app/lib/roleLabels";
import { EmptyState } from "@/app/components/ui";

type SearchParamValue = string | string[] | undefined;
type TodaySearchParams = {
  replayTodayAnimation?: SearchParamValue;
  pwaAnimationFix?: SearchParamValue;
};

function firstSearchParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function enabledSearchParam(value: SearchParamValue): string | undefined {
  const raw = firstSearchParam(value);
  if (raw == null) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(normalized)) return undefined;
  return raw || "1";
}

export default async function TodayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
  searchParams?: Promise<TodaySearchParams>;
}) {
  const { locale, churchSlug } = await params;
  const sp = (await searchParams) ?? {};
  const animationReplayKey =
    enabledSearchParam(sp.replayTodayAnimation) ?? enabledSearchParam(sp.pwaAnimationFix);
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");
  const rl = resolveRoleLabels(church, locale as "ja" | "en");

  // 4クエリを並列化（completion のみ devotion に依存するため then で連結）。
  const devotionP = getTodayDevotion(supabase, church);
  const [devotion, completion, prayersAll, reflections] = await Promise.all([
    devotionP,
    devotionP.then((d) => (d ? getViewerCompletion(supabase, d.id) : null)),
    getTodayPrayerSet(supabase, viewer, locale as "ja" | "en"),
    getReflections(supabase, viewer, locale as "ja" | "en", 3),
  ]);
  const prayers = prayersAll;
  const todayKey = toDateKey(new Date(), church.timezone);
  const shareHref = `/${locale}/church/${church.slug}/prayers/new`;
  const prayersHref = `/${locale}/church/${church.slug}/prayers`;

  const prayerPreview = (
    <section className="space-y-3">
      {prayers.length === 0 ? (
        <EmptyState icon={HeartHandshake} title={fmt(t("prayer.empty"), { pastor: rl.pastor })} />
      ) : (
        <TodayPrayerCarousel
          prayers={prayers}
          church={church}
          locale={locale as "ja" | "en"}
          prayersHref={prayersHref}
        />
      )}
    </section>
  );

  return (
    <>
      {!devotion ? (
        <TodayPrayerPreviewFlow
          churchId={church.id}
          todayKey={todayKey}
          animationReplayKey={animationReplayKey}
        >
          {prayerPreview}
        </TodayPrayerPreviewFlow>
      ) : (
        <TodayDevotionFlow
          devotion={devotion}
          church={church}
          locale={locale as "ja" | "en"}
          todayKey={todayKey}
          animationReplayKey={animationReplayKey}
          initialRead={completion?.read ?? false}
          initialPrayed={completion?.prayed ?? false}
          prayers={prayers}
          reflections={reflections}
          shareHref={shareHref}
          prayersHref={prayersHref}
          talkToPastorLabel={fmt(t("today.talkToPastor"), { pastor: rl.pastor })}
        />
      )}
    </>
  );
}
