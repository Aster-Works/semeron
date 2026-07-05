"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Church,
  EyeOff,
  HeartHandshake,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Users,
  Check,
  type LucideIcon,
} from "lucide-react";
import type { Group, Locale, Visibility } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { localize } from "@/app/lib/i18n";
import { submitPrayerRequest } from "@/app/lib/db/actions";
import {
  Button,
  buttonClass,
  Callout,
  Card,
  CardBody,
  Field,
  Input,
  Modal,
  Textarea,
  Toggle,
} from "@/app/components/ui";
import { fmt } from "@/app/lib/roleLabels";
import { cn } from "@/app/lib/utils";

const VIS_ORDER: { key: Visibility; icon: LucideIcon }[] = [
  { key: "pastor_only", icon: Lock },
  { key: "elders", icon: ShieldCheck },
  { key: "prayer_team", icon: HeartHandshake },
  { key: "group", icon: Users },
  { key: "church", icon: Church },
  { key: "anonymous_church", icon: EyeOff },
];

const BROAD: Visibility[] = ["church", "anonymous_church"];

export function PrayerRequestForm({
  locale,
  churchId,
  churchSlug,
  churchDefaultLocale,
  groups,
  visLabels,
  roleLabels,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  churchDefaultLocale: Locale;
  /** 教会別の呼び方（公開範囲/役割）。省略時は標準ラベル。 */
  visLabels?: Partial<Record<Visibility, string>>;
  roleLabels?: Partial<Record<string, string>>;
  groups: Group[];
}) {
  const { t } = useLocale();
  const feedHref = `/${locale}/church/${churchSlug}/prayers`;
  const visibilityOptions = groups.length > 0 ? VIS_ORDER : VIS_ORDER.filter((v) => v.key !== "group");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [expiry, setExpiry] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [thirdParty, setThirdParty] = useState(false);
  const [pastorConsult, setPastorConsult] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit = title.trim() && body.trim() && visibility;

  const doSubmit = () => {
    setConfirmOpen(false);
    if (!visibility) return;
    setError(null);
    startTransition(async () => {
      const res = await submitPrayerRequest({
        churchId,
        churchSlug,
        locale,
        title: title.trim(),
        body: body.trim(),
        visibility,
        groupId: visibility === "group" ? groupId : null,
        anonymous,
        includesThirdParty: thirdParty,
        pastorConsult,
        expiresAt: expiry || null,
      });
      if (res.ok) setSubmitted(true);
      else setError(res.error);
    });
  };

  const onSubmit = () => {
    if (!canSubmit) return;
    if (visibility && BROAD.includes(visibility)) {
      setConfirmOpen(true);
    } else {
      doSubmit();
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardBody className="space-y-4 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sage-soft text-sage-ink">
            <Check className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">{t("prayerForm.afterSubmitTitle")}</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted text-balance-safe">
              {fmt(t("prayerForm.afterSubmit"), { pastor: roleLabels?.pastor ?? t("role.pastor"), prayerTeam: roleLabels?.prayer_team ?? t("role.prayer_team") })}
            </p>
          </div>
          <Link href={feedHref} className={buttonClass({ variant: "secondary", size: "sm" })}>
            {t("prayer.feedTitle")}
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 投稿前の注意（必ず表示: 04 §7 / 05 §6） */}
      <Callout tone="rose" icon={ShieldAlert} title={t("prayerForm.noticeTitle")}>
        {fmt(t("prayerForm.notice"), { pastorOnly: visLabels?.pastor_only ?? t("visibility.pastor_only"), prayerTeamOnly: visLabels?.prayer_team ?? t("visibility.prayer_team") })}
      </Callout>

      <Card>
        <CardBody className="space-y-5">
          <Field label={t("prayerForm.titleLabel")} htmlFor="pr-title" required>
            <Input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("prayerForm.titlePlaceholder")}
              maxLength={80}
            />
          </Field>

          <Field label={t("prayerForm.bodyLabel")} htmlFor="pr-body" required hint={t("prayerForm.bodyPlaceholder")}>
            <Textarea
              id="pr-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
            />
          </Field>

          {/* 公開範囲: 誤タップしにくい大きなカード。必須。 */}
          <Field label={t("prayerForm.visibilityLabel")} required>
            <div className="grid gap-2 sm:grid-cols-2">
              {visibilityOptions.map(({ key, icon: Icon }) => {
                const selected = visibility === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVisibility(key)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                      selected
                        ? "border-sage bg-sage-soft ring-2 ring-sage/30"
                        : "border-line-strong bg-surface hover:bg-mist",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        selected ? "bg-surface text-sage-ink" : "bg-mist text-muted",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">
                        {visLabels?.[key] ?? t(`visibility.${key}`)}
                      </span>
                      {BROAD.includes(key) ? (
                        <span className="block text-[11px] text-rose-ink">
                          {locale === "ja" ? "広い範囲に共有されます" : "Shared widely"}
                        </span>
                      ) : null}
                    </span>
                    {selected ? <Check className="ml-auto h-4 w-4 text-sage-ink" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          </Field>

          {visibility === "group" ? (
            <Field label={locale === "ja" ? "小グループ" : "Small group"} htmlFor="pr-group" required>
              <select
                id="pr-group"
                required
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-sage focus:ring-2 focus:ring-sage/20"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {localize(group.name, locale, churchDefaultLocale)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <div className="space-y-2">
            <Toggle
              id="pr-anon"
              checked={anonymous}
              onChange={setAnonymous}
              label={t("prayerForm.anonymousLabel")}
            />
            <Toggle
              id="pr-third"
              checked={thirdParty}
              onChange={setThirdParty}
              label={t("prayerForm.thirdPartyLabel")}
            />
            <Toggle
              id="pr-consult"
              checked={pastorConsult}
              onChange={setPastorConsult}
              label={fmt(t("prayerForm.pastorConsultLabel"), { pastor: roleLabels?.pastor ?? t("role.pastor") })}
            />
          </div>

          {thirdParty ? (
            <Callout tone="rose">{t("moderation.thirdPartyWarn")}</Callout>
          ) : null}

          <Field label={t("prayerForm.expiryLabel")} htmlFor="pr-expiry" hint={locale === "ja" ? "任意。期限を過ぎると一覧から静かに消えます。" : "Optional. After this date it quietly leaves the list."}>
            <Input id="pr-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </Field>

          {error ? <Callout tone="rose">{error}</Callout> : null}

          <div className="flex items-center justify-end gap-2">
            <Link href={feedHref} className={buttonClass({ variant: "quiet", size: "md" })}>
              {t("common.cancel")}
            </Link>
            <Button onClick={onSubmit} disabled={!canSubmit || pending}>
              {t("prayerForm.submit")}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 広い公開範囲の確認モーダル */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("prayerForm.broadWarningTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {t("prayerForm.narrow")}
            </Button>
            <Button onClick={doSubmit}>{t("prayerForm.broadContinue")}</Button>
          </>
        }
      >
        {t("prayerForm.broadWarning")}
      </Modal>
    </div>
  );
}
