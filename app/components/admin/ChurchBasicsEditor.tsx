"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { Locale, Localized, PlanTier, SoftGateMode } from "@/app/lib/demo/types";
import { updateChurchSettings } from "@/app/lib/db/actions";
import { localize } from "@/app/lib/i18n";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { Button, Field, Input, Select } from "@/app/components/ui";

const TIMEZONE_OPTIONS = [
  "Asia/Tokyo",
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "Europe/London",
  "Europe/Paris",
  "Asia/Seoul",
  "Asia/Taipei",
  "Asia/Singapore",
  "Australia/Sydney",
];

const SOFT_GATE_MODES: SoftGateMode[] = ["gentle", "focused", "off"];

function timeForInput(value: string): string {
  return value.match(/^\d{2}:\d{2}/)?.[0] ?? "06:30";
}

function localeLabel(locale: Locale, jaMode: boolean): string {
  if (locale === "ja") return jaMode ? "日本語" : "Japanese";
  return jaMode ? "英語" : "English";
}

export function ChurchBasicsEditor({
  locale,
  churchId,
  churchSlug,
  initial,
  canEdit,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  initial: {
    name: Localized;
    defaultLocale: Locale;
    timezone: string;
    morningNotificationTime: string;
    softGateMode: SoftGateMode;
    plan: PlanTier;
  };
  canEdit: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const jaMode = locale === "ja";
  const initialName = localize(initial.name, initial.defaultLocale, locale);
  const [name, setName] = useState(initialName);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [morningTime, setMorningTime] = useState(timeForInput(initial.morningNotificationTime));
  const [softGateMode, setSoftGateMode] = useState<SoftGateMode>(initial.softGateMode);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const timezoneOptions = useMemo(
    () => Array.from(new Set([initial.timezone, ...TIMEZONE_OPTIONS])).filter(Boolean),
    [initial.timezone],
  );
  const dirty =
    name.trim() !== initialName ||
    timezone !== initial.timezone ||
    morningTime !== timeForInput(initial.morningNotificationTime) ||
    softGateMode !== initial.softGateMode;

  const save = () => {
    setSaved(false);
    setError(false);
    startTransition(async () => {
      const res = await updateChurchSettings({
        churchId,
        churchSlug,
        locale,
        churchName: name,
        churchNameLocale: initial.defaultLocale,
        timezone,
        morningNotificationTime: morningTime,
        softGateMode,
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <Field
        label={t("settings.churchName")}
        htmlFor="church-name"
        hint={t("settings.churchNameHint")}
        required
      >
        <Input
          id="church-name"
          value={name}
          maxLength={120}
          disabled={!canEdit || pending}
          onChange={(e) => { setName(e.target.value); setSaved(false); setError(false); }}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("settings.defaultLocale")}>
          <Input value={localeLabel(initial.defaultLocale, jaMode)} readOnly disabled />
        </Field>
        <Field label={t("settings.timezone")} htmlFor="church-timezone" required>
          <Select
            id="church-timezone"
            value={timezone}
            disabled={!canEdit || pending}
            onChange={(e) => { setTimezone(e.target.value); setSaved(false); setError(false); }}
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t("settings.morningTime")}
          htmlFor="church-morning-time"
          hint={t("settings.morningTimeHint")}
          required
        >
          <Input
            id="church-morning-time"
            type="time"
            step={60}
            value={morningTime}
            disabled={!canEdit || pending}
            onChange={(e) => { setMorningTime(e.target.value); setSaved(false); setError(false); }}
            data-testid="church-morning-time"
          />
        </Field>
        <Field label={t("settings.plan")}>
          <Input value={initial.plan} readOnly disabled className="uppercase" />
        </Field>
      </div>

      <Field label={t("settings.softGate")} hint={t("settings.softGateHint")} htmlFor="church-soft-gate">
        <Select
          id="church-soft-gate"
          value={softGateMode}
          disabled={!canEdit || pending}
          onChange={(e) => { setSoftGateMode(e.target.value as SoftGateMode); setSaved(false); setError(false); }}
        >
          {SOFT_GATE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`settings.softGate.${mode}`)}
            </option>
          ))}
        </Select>
      </Field>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={save}
            disabled={!dirty || pending || !name.trim() || !morningTime}
            data-testid="church-basics-save"
          >
            <Save className="h-4 w-4" aria-hidden />
            {pending ? "..." : t("common.save")}
          </Button>
          {saved ? <span className="text-xs text-sage-strong">{t("settings.basicsSaved")}</span> : null}
          {error ? <span className="text-xs text-rose-ink">{t("settings.basicsError")}</span> : null}
        </div>
      ) : (
        <p className="text-xs text-muted">{t("settings.basicsAdminOnly")}</p>
      )}
    </div>
  );
}
