import { BookOpenText, ShieldCheck } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import type { SoftGateMode } from "@/app/lib/demo/types";
import { createT, localize } from "@/app/lib/i18n";
import { languageName } from "@/app/lib/i18n/languages";
import { isChurchAdmin } from "@/app/lib/demo/visibility";
import { AccessDenied } from "@/app/components/admin/AdminShell";
import { ContentLanguagesEditor } from "@/app/components/admin/ContentLanguagesEditor";
import { InviteLinkCard } from "@/app/components/admin/InviteLinkCard";
import { PastorAssistSettingsEditor } from "@/app/components/admin/PastorAssistSettingsEditor";
import {
  Badge,
  Callout,
  Card,
  CardBody,
  Field,
  Input,
  SectionHeading,
  Select,
} from "@/app/components/ui";

const SOFT_GATE_MODES: SoftGateMode[] = ["gentle", "focused", "off"];

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale: rawLocale, churchSlug } = await params;
  const locale = rawLocale as "ja" | "en";
  const { viewer } = await requireChurchContext(locale, churchSlug);
  if (!isChurchAdmin(viewer)) {
    return <AccessDenied locale={locale as "ja" | "en"} church={viewer.church} />;
  }
  const church = viewer.church;
  const t = createT(locale);
  const jaMode = locale === "ja";

  // Pastor Assist 設定は owner/pastor のみ変更可（RLS と一致）。
  const canEditSettings = (viewer.membership?.roles ?? []).some((r) => r === "owner" || r === "pastor");
  const assistConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

  const localeLabel =
    church.defaultLocale === "ja"
      ? jaMode
        ? "日本語"
        : "Japanese"
      : jaMode
        ? "英語"
        : "English";

  return (
    <>
      <div className="space-y-6">
        <SectionHeading
          title={t("settings.title")}
          description={
            jaMode
              ? "Pastor Assist の設定は保存できます。その他の項目は現在表示のみです。"
              : "Pastor Assist settings are saved. Other items are display-only for now."
          }
        />

        {/* --- 基本情報 --- */}
        <Card>
          <CardBody className="space-y-5">
            <Field label={t("settings.churchName")}>
              <Input
                value={localize(church.name, locale, church.defaultLocale)}
                readOnly
                disabled
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("settings.defaultLocale")}>
                <Input value={localeLabel} readOnly disabled />
              </Field>
              <Field label={t("settings.timezone")}>
                <Input value={church.timezone} readOnly disabled />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("settings.morningTime")}>
                <Input value={church.morningNotificationTime} readOnly disabled />
              </Field>
              <Field label={t("settings.plan")}>
                <Input value={church.plan} readOnly disabled className="uppercase" />
              </Field>
            </div>

            <Field label={t("settings.inviteCode")}>
              <InviteLinkCard locale={locale} inviteCode={church.inviteCode} />
            </Field>
          </CardBody>
        </Card>

        {/* --- 配信言語（教会ごとにカスタム。UIの ja/en とは独立） --- */}
        <Card>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm font-medium text-ink">{t("settings.contentLanguages")}</p>
              <p className="mt-1 text-xs text-muted text-balance-safe">
                {t("settings.contentLanguagesHint")}
              </p>
              <p className="mt-1 text-xs text-muted">
                {jaMode ? "現在" : "Currently"}:{" "}
                {church.contentLanguages.map((c) => languageName(c)).join(" · ")}
              </p>
            </div>
            <ContentLanguagesEditor initial={church.contentLanguages} />
          </CardBody>
        </Card>

        {/* --- Pastor Assist（AI補助）: owner/pastor が変更・保存できる --- */}
        <Card>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm font-medium text-ink">{t("settings.pastorAssist")}</p>
              <p className="mt-1 text-xs text-muted text-balance-safe">
                {t("settings.pastorAssistHint")}
              </p>
            </div>
            <PastorAssistSettingsEditor
              churchId={church.id}
              churchSlug={church.slug}
              locale={locale}
              initial={{
                pastorAssistEnabled: church.pastorAssistEnabled,
                allowPrayerAi: church.allowPrayerAi,
              }}
              canEdit={canEditSettings}
              assistConfigured={assistConfigured}
            />
          </CardBody>
        </Card>

        {/* --- ソフトゲート（05 §5：ハードロックしない） --- */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-ink">{t("settings.softGate")}</p>
              <Badge tone="sage">{t(`settings.softGate.${church.softGateMode}`)}</Badge>
            </div>

            <Field hint={t("settings.softGateHint")}>
              <Select value={church.softGateMode} disabled>
                {SOFT_GATE_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`settings.softGate.${mode}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        {/* --- 聖書本文の扱い（Data 04 §9） --- */}
        <Callout tone="gold" icon={BookOpenText} title={t("settings.biblePolicy")}>
          <p className="text-balance-safe">{t("settings.biblePolicyBody")}</p>
        </Callout>

        <p className="flex items-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-sage-ink" aria-hidden />
          {jaMode
            ? "Pastor Assist の設定は owner / pastor が変更・保存できます。その他の項目は次のフェーズで編集可能になります。"
            : "Pastor Assist settings can be changed by owner / pastor. Other items become editable in a later phase."}
        </p>
      </div>
    </>
  );
}
