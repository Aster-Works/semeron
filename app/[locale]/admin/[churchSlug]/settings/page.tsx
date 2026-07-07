import { BookOpenText, ShieldCheck } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { createT } from "@/app/lib/i18n";
import { languageName } from "@/app/lib/i18n/languages";
import { isChurchAdmin } from "@/app/lib/demo/visibility";
import { AccessDenied } from "@/app/components/admin/AdminShell";
import { ChurchBasicsEditor } from "@/app/components/admin/ChurchBasicsEditor";
import { ContentLanguagesEditor } from "@/app/components/admin/ContentLanguagesEditor";
import { InviteLinkCard } from "@/app/components/admin/InviteLinkCard";
import { PastorAssistSettingsEditor } from "@/app/components/admin/PastorAssistSettingsEditor";
import { RetentionPolicyEditor } from "@/app/components/admin/RetentionPolicyEditor";
import { RoleLabelsEditor } from "@/app/components/admin/RoleLabelsEditor";
import {
  Callout,
  Card,
  CardBody,
  Field,
  SectionHeading,
} from "@/app/components/ui";

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

  return (
    <>
      <div className="space-y-6">
        <SectionHeading
          title={t("settings.title")}
          description={
            jaMode
              ? "owner / pastor は基本設定・配信言語・AI補助設定を保存できます。"
              : "Owners / pastors can save basics, content languages, and AI settings."
          }
        />

        {/* --- 基本情報 --- */}
        <Card>
          <CardBody className="space-y-5">
            <ChurchBasicsEditor
              locale={locale}
              churchId={church.id}
              churchSlug={church.slug}
              initial={{
                name: church.name,
                defaultLocale: church.defaultLocale,
                timezone: church.timezone,
                morningNotificationTime: church.morningNotificationTime,
                plan: church.plan,
              }}
              canEdit={canEditSettings}
            />

            <Field label={t("settings.inviteCode")}>
              <InviteLinkCard
                locale={locale}
                churchId={church.id}
                churchSlug={church.slug}
                inviteCode={church.inviteCode}
                inviteCodeExpiresAt={church.inviteCodeExpiresAt}
                inviteCodeRotatedAt={church.inviteCodeRotatedAt}
                inviteCodeExpired={church.inviteCodeExpired}
                canEdit={canEditSettings}
              />
            </Field>
          </CardBody>
        </Card>

        {/* --- 保持期間ポリシー / 自動クリーンアップ --- */}
        <Card>
          <CardBody>
            <RetentionPolicyEditor
              locale={locale}
              churchId={church.id}
              churchSlug={church.slug}
              initial={church.retentionPolicy}
              canEdit={canEditSettings}
            />
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
            <ContentLanguagesEditor
              initial={church.contentLanguages}
              churchId={church.id}
              churchSlug={church.slug}
              locale={locale}
              canEdit={canEditSettings}
            />
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
              entitled={church.aiAddonEnabled}
            />
          </CardBody>
        </Card>

        {/* --- 役割の呼び方（方針A: 権限固定・表示名のみ教会別カスタム） --- */}
        <RoleLabelsEditor
          locale={locale}
          churchId={church.id}
          churchSlug={church.slug}
          contentLanguages={church.contentLanguages}
          initial={church.roleLabels}
          canEdit={canEditSettings}
        />

        {/* --- 聖書本文の扱い（Data 04 §9） --- */}
        <Callout tone="gold" icon={BookOpenText} title={t("settings.biblePolicy")}>
          <p className="text-balance-safe">{t("settings.biblePolicyBody")}</p>
        </Callout>

        <p className="flex items-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-sage-ink" aria-hidden />
          {jaMode
            ? "重要な設定変更は owner / pastor に限定され、監査ログに記録されます。"
            : "Important settings changes are limited to owner / pastor and recorded in the audit log."}
        </p>
      </div>
    </>
  );
}
