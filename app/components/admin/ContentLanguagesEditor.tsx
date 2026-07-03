"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages, Plus, X } from "lucide-react";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import type { Locale } from "@/app/lib/demo/types";
import { availableLanguages, languageName } from "@/app/lib/i18n/languages";
import { updateContentLanguages } from "@/app/lib/db/actions";
import { Badge, Button } from "@/app/components/ui";

/**
 * 教会の配信言語をカスタムする（Settings 内）。
 * UI の ja/en とは独立。先頭が主言語。owner/pastor は保存できる。
 */
export function ContentLanguagesEditor({
  initial,
  churchId,
  churchSlug,
  locale,
  canEdit,
}: {
  initial: string[];
  churchId: string;
  churchSlug: string;
  locale: Locale;
  canEdit: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [langs, setLangs] = useState<string[]>(initial.length ? initial : ["ja"]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const addable = availableLanguages(langs);
  const dirty = useMemo(
    () => langs.join(",") !== (initial.length ? initial : ["ja"]).join(","),
    [initial, langs],
  );

  const add = (code: string) => {
    setSaved(false);
    setError(false);
    if (code && !langs.includes(code)) setLangs([...langs, code]);
  };
  const remove = (code: string) => {
    if (langs.length <= 1) return;
    setSaved(false);
    setError(false);
    setLangs(langs.filter((l) => l !== code));
  };
  const save = () => {
    setSaved(false);
    setError(false);
    startTransition(async () => {
      const res = await updateContentLanguages({
        churchId,
        churchSlug,
        locale,
        contentLanguages: langs,
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {langs.map((l, i) => (
          <span
            key={l}
            className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage-soft px-3 py-1.5 text-sm font-medium text-sage-ink"
          >
            <Languages className="h-3.5 w-3.5" aria-hidden />
            {languageName(l)}
            {i === 0 ? (
              <Badge tone="cedar">{t("settings.primaryLang")}</Badge>
            ) : (
              <button
                type="button"
                disabled={!canEdit || pending}
                onClick={() => remove(l)}
                aria-label={t("editor.removeLanguage")}
                className="rounded-full p-0.5 hover:bg-sage/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </span>
        ))}

        {addable.length > 0 ? (
          <label className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-sm font-medium text-muted hover:bg-mist hover:text-ink">
            <Plus className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t("editor.addLanguage")}</span>
            <select
              value=""
              disabled={!canEdit || pending}
              onChange={(e) => {
                add(e.target.value);
                e.currentTarget.selectedIndex = 0;
              }}
              className="cursor-pointer appearance-none bg-transparent pr-1 focus:outline-none disabled:cursor-not-allowed"
              aria-label={t("editor.addLanguage")}
              data-testid="content-language-select"
            >
              <option value="" disabled>
                {t("editor.addLanguage")}
              </option>
              {addable.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <p className="text-xs text-muted text-balance-safe">{t("settings.langDemoNote")}</p>
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={save}
            disabled={!dirty || pending}
            data-testid="content-language-save"
          >
            {pending ? "..." : t("common.save")}
          </Button>
          {saved ? (
            <span className="text-xs text-sage-strong">
              {locale === "ja" ? "保存しました。" : "Saved."}
            </span>
          ) : null}
          {error ? (
            <span className="text-xs text-rose-ink">
              {locale === "ja" ? "保存できませんでした。" : "Could not save."}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
