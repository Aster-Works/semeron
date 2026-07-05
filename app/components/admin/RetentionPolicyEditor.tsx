"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Save, Trash2 } from "lucide-react";
import type { Locale, RetentionPolicy } from "@/app/lib/demo/types";
import { runRetentionCleanupNow, updateChurchSettings } from "@/app/lib/db/actions";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { Button, Field, Input } from "@/app/components/ui";

type RetentionKey = keyof RetentionPolicy;

const FIELDS: { key: RetentionKey; min: number; max: number; labelKey: string; hintKey: string }[] = [
  {
    key: "reflectionVisibleDays",
    min: 7,
    max: 3650,
    labelKey: "settings.retention.reflections",
    hintKey: "settings.retention.reflectionsHint",
  },
  {
    key: "notificationReadDays",
    min: 7,
    max: 3650,
    labelKey: "settings.retention.readNotifications",
    hintKey: "settings.retention.readNotificationsHint",
  },
  {
    key: "notificationUnreadDays",
    min: 14,
    max: 3650,
    labelKey: "settings.retention.unreadNotifications",
    hintKey: "settings.retention.unreadNotificationsHint",
  },
  {
    key: "adminNotificationDays",
    min: 30,
    max: 3650,
    labelKey: "settings.retention.adminNotifications",
    hintKey: "settings.retention.adminNotificationsHint",
  },
  {
    key: "reactionIdentityDays",
    min: 7,
    max: 3650,
    labelKey: "settings.retention.reactions",
    hintKey: "settings.retention.reactionsHint",
  },
  {
    key: "auditLogDays",
    min: 180,
    max: 3650,
    labelKey: "settings.retention.auditLogs",
    hintKey: "settings.retention.auditLogsHint",
  },
];

function samePolicy(a: RetentionPolicy, b: RetentionPolicy): boolean {
  return FIELDS.every((field) => a[field.key] === b[field.key]);
}

function clamp(value: string, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function RetentionPolicyEditor({
  locale,
  churchId,
  churchSlug,
  initial,
  canEdit,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  initial: RetentionPolicy;
  canEdit: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [policy, setPolicy] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [cleanupSummary, setCleanupSummary] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = !samePolicy(policy, initial);

  const update = (key: RetentionKey, value: string, min: number, max: number) => {
    setPolicy((prev) => ({ ...prev, [key]: clamp(value, min, max) }));
    setSaved(false);
    setError(false);
    setCleanupSummary(null);
  };

  const save = () => {
    setSaved(false);
    setError(false);
    startTransition(async () => {
      const res = await updateChurchSettings({
        churchId,
        churchSlug,
        locale,
        retentionPolicy: policy,
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  const cleanupNow = () => {
    setSaved(false);
    setError(false);
    setCleanupSummary(null);
    startTransition(async () => {
      const res = await runRetentionCleanupNow({ churchId, churchSlug, locale });
      if (!res.ok) {
        setError(true);
        return;
      }
      setCleanupSummary(JSON.stringify(res.data ?? {}));
      window.dispatchEvent(new Event("semeron:unread-refresh"));
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-ink">{t("settings.retention.title")}</p>
        <p className="mt-1 text-xs text-muted text-balance-safe">{t("settings.retention.hint")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <Field
            key={field.key}
            label={t(field.labelKey as never)}
            htmlFor={`retention-${field.key}`}
            hint={t(field.hintKey as never)}
          >
            <Input
              id={`retention-${field.key}`}
              type="number"
              min={field.min}
              max={field.max}
              step={1}
              value={policy[field.key]}
              disabled={!canEdit || pending}
              onChange={(e) => update(field.key, e.target.value, field.min, field.max)}
            />
          </Field>
        ))}
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={save} disabled={!dirty || pending}>
            <Save className="h-4 w-4" aria-hidden />
            {pending ? "..." : t("common.save")}
          </Button>
          <Button size="sm" variant="secondary" onClick={cleanupNow} disabled={pending}>
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("settings.retention.cleanupNow")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setPolicy(initial); setSaved(false); setError(false); }}
            disabled={!dirty || pending}
          >
            <RotateCw className="h-4 w-4" aria-hidden />
            {t("settings.retention.reset")}
          </Button>
          {saved ? <span className="text-xs text-sage-strong">{t("settings.basicsSaved")}</span> : null}
          {error ? <span className="text-xs text-rose-ink">{t("settings.basicsError")}</span> : null}
        </div>
      ) : (
        <p className="text-xs text-muted">{t("settings.basicsAdminOnly")}</p>
      )}

      {cleanupSummary ? (
        <p className="text-xs text-muted text-balance-safe">
          {t("settings.retention.cleanupDone")} {cleanupSummary}
        </p>
      ) : null}
    </div>
  );
}
