"use client";

import { useState, useTransition } from "react";
import { Lock, Sparkles } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { Toggle, Callout } from "@/app/components/ui";
import { updateChurchSettings } from "@/app/lib/db/actions";

/**
 * Pastor Assist（AI補助）の教会設定トグル。
 * - owner/pastor のみ変更可（canEdit）。RLS でも二重に守られる。
 * - 「祈祷本文の AI 送信」は Pastor Assist 有効時のみ操作でき、既定 false。
 */
export function PastorAssistSettingsEditor({
  churchId,
  churchSlug,
  locale,
  initial,
  canEdit,
  assistConfigured,
  entitled,
}: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  initial: { pastorAssistEnabled: boolean; allowPrayerAi: boolean };
  canEdit: boolean;
  assistConfigured: boolean;
  /** AIサポートの課金アドオンが有効か。false のときはトグルを操作させず案内を出す。 */
  entitled: boolean;
}) {
  const { t } = useLocale();
  const [enabled, setEnabled] = useState(initial.pastorAssistEnabled);
  const [allowPrayer, setAllowPrayer] = useState(initial.allowPrayerAi);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = (patch: { pastorAssistEnabled?: boolean; allowPrayerAi?: boolean }) => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateChurchSettings({ churchId, churchSlug, locale, ...patch });
      if (res.ok) setSaved(true);
      else setError(res.error);
    });
  };

  const onToggleEnabled = (v: boolean) => {
    setEnabled(v);
    // 無効化したら祈祷 AI 送信も安全側で false に落とす
    const patch = v ? { pastorAssistEnabled: true } : { pastorAssistEnabled: false, allowPrayerAi: false };
    if (!v) setAllowPrayer(false);
    persist(patch);
  };

  const onTogglePrayer = (v: boolean) => {
    setAllowPrayer(v);
    persist({ allowPrayerAi: v });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sage-soft text-sage-ink">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <span className="rounded-full border border-sage/40 bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sage-ink">
          AI
        </span>
        <span className="rounded-full border border-gold/40 bg-gold-soft/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-ink">
          {t("settings.aiAddonBadge")}
        </span>
      </div>

      {/* 課金アドオン未購入: トグルは操作させず、案内だけ出す（無料では使えない）。 */}
      {!entitled ? (
        <Callout tone="gold" icon={Lock} title={t("settings.aiAddonUpsellTitle")}>
          {t("settings.aiAddonUpsell")}
        </Callout>
      ) : null}

      <div className={entitled ? "" : "pointer-events-none opacity-50"} aria-disabled={!entitled}>
        <Toggle
          id="pastor-assist-enabled"
          checked={enabled}
          onChange={canEdit && entitled ? onToggleEnabled : () => {}}
          label={t("settings.pastorAssist")}
          description={t("settings.pastorAssistHint")}
        />

        <div className={enabled && entitled ? "mt-3" : "mt-3 pointer-events-none opacity-50"} aria-disabled={!enabled || !entitled}>
          <Toggle
            id="allow-prayer-ai"
            checked={allowPrayer}
            onChange={canEdit && enabled && entitled ? onTogglePrayer : () => {}}
            label={t("settings.allowPrayerAi")}
            description={t("settings.allowPrayerAiHint")}
          />
        </div>
      </div>

      {entitled && enabled && !assistConfigured ? (
        <Callout tone="neutral">{t("settings.assistNotConfigured")}</Callout>
      ) : null}

      {!canEdit ? (
        <p className="text-xs text-muted">{t("settings.assistAdminOnly")}</p>
      ) : error ? (
        <p className="text-xs text-rose-ink">{error}</p>
      ) : saved ? (
        <p className="text-xs text-sage-strong">{pending ? "…" : t("settings.assistSaved")}</p>
      ) : null}
    </div>
  );
}
