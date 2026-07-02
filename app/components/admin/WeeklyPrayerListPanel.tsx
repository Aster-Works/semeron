"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ListChecks, ShieldAlert, Sparkles } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { Button, Callout, Card, CardBody, Field, Select, Toggle } from "@/app/components/ui";
import { assistWeeklyPrayerList, type PrayerListAudience } from "@/app/lib/pastor-assist/actions";
import type { WeeklyPrayerList } from "@/app/lib/pastor-assist/types";

/**
 * 週次祈祷リスト（08 §9）。承認済み課題を祈祷会・小グループ用に整理して出す。
 * - Pastor Assist + allow_prayer_ai が有効なときだけ生成できる。
 * - 送信前に明示確認。名前は既定でリダクション。**提案・下書きのみ**（自動配信しない）。
 */
export function WeeklyPrayerListPanel({
  locale,
  churchSlug,
  assistEnabled,
  allowPrayerAi,
}: {
  locale: Locale;
  churchSlug: string;
  assistEnabled: boolean;
  allowPrayerAi: boolean;
}) {
  const { t } = useLocale();
  const ja = locale === "ja";
  const [audience, setAudience] = useState<PrayerListAudience>("prayer_meeting");
  const [includeNames, setIncludeNames] = useState(false);
  const [stage, setStage] = useState<"idle" | "confirm">("idle");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<WeeklyPrayerList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!assistEnabled || !allowPrayerAi) {
    return (
      <Callout tone="neutral" icon={Sparkles}>
        {t("prayerList.disabled")}
      </Callout>
    );
  }

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await assistWeeklyPrayerList({
        churchSlug,
        locale,
        audience,
        includeNames,
        confirmed: true,
      });
      setStage("idle");
      if (res.ok) {
        setResult(res.data);
      } else {
        setError(res.code === "not_configured" ? t("assist.notConfigured") : t("assist.error"));
      }
    });
  };

  const plainText = result ? toPlainText(result, ja) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 失敗時は画面のテキストを手動選択でコピーしてもらう
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("prayerList.audience")}>
              <Select
                value={audience}
                onChange={(e) => setAudience(e.target.value as PrayerListAudience)}
                disabled={pending}
              >
                <option value="prayer_meeting">{t("prayerList.audience.prayerMeeting")}</option>
                <option value="small_group">{t("prayerList.audience.smallGroup")}</option>
                <option value="pastors">{t("prayerList.audience.pastors")}</option>
              </Select>
            </Field>
            <div className="flex items-end">
              <Toggle
                checked={includeNames}
                onChange={setIncludeNames}
                label={t("prayerList.includeNames")}
                description={t("prayerList.includeNamesHint")}
              />
            </div>
          </div>

          <p className="text-xs text-muted text-balance-safe">{t("prayerList.note")}</p>

          {stage === "idle" ? (
            <Button variant="secondary" size="sm" onClick={() => setStage("confirm")} disabled={pending}>
              <ListChecks className="h-4 w-4" aria-hidden />
              {t("prayerList.generate")}
            </Button>
          ) : (
            <div className="space-y-2">
              <Callout tone="gold" icon={ShieldAlert}>
                {t("prayerList.confirmWarn")}
              </Callout>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" onClick={run} disabled={pending}>
                  {pending ? t("assist.generating") : t("prayerList.confirm")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setStage("idle")} disabled={pending}>
                  {t("assist.review.cancel")}
                </Button>
              </div>
            </div>
          )}

          {error ? <p className="text-sm text-rose-ink">{error}</p> : null}
        </CardBody>
      </Card>

      {result ? (
        result.sourceCount === 0 ? (
          <Callout tone="neutral">{t("prayerList.empty")}</Callout>
        ) : (
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-sage/40 bg-sage-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-sage-ink">
                  {t("assist.draftLabel")}
                </span>
                <Button variant="ghost" size="sm" onClick={copy}>
                  {copied ? <Check className="h-4 w-4 text-sage-ink" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? t("prayerList.copied") : t("prayerList.copy")}
                </Button>
              </div>

              {result.consentWarnings.length > 0 ? (
                <Callout tone="rose" icon={ShieldAlert}>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {result.consentWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </Callout>
              ) : null}

              <div className="space-y-4">
                {result.sections.map((s, i) => (
                  <div key={i} className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-ink text-balance-safe">{s.heading}</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
                      {s.items.map((item, j) => (
                        <li key={j} className="text-balance-safe">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {result.moderatorNotes.length > 0 ? (
                <div className="border-t border-line pt-3">
                  <p className="text-xs font-medium text-muted">{t("assist.review.notes")}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted">
                    {result.moderatorNotes.map((n, i) => (
                      <li key={i} className="text-balance-safe">{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Callout tone="neutral">{t("prayerList.advisoryNote")}</Callout>
            </CardBody>
          </Card>
        )
      ) : null}
    </div>
  );
}

/** コピー用のプレーンテキスト（祈祷会資料へ貼り付けやすく）。 */
function toPlainText(list: WeeklyPrayerList, ja: boolean): string {
  const out: string[] = [ja ? "【今週の祈祷リスト】" : "Weekly Prayer List", ""];
  for (const s of list.sections) {
    out.push(s.heading);
    for (const item of s.items) out.push(`・${item}`);
    out.push("");
  }
  return out.join("\n").trim();
}
