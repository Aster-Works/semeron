"use client";

import { useState } from "react";
import { Languages, Plus, X } from "lucide-react";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { availableLanguages, languageName } from "@/app/lib/i18n/languages";
import { Badge } from "@/app/components/ui";

/**
 * 教会の配信言語をカスタムする（Settings 内）。
 * UI の ja/en とは独立。先頭が主言語。デモではローカル状態のみ（Phase 2 で永続化）。
 */
export function ContentLanguagesEditor({ initial }: { initial: string[] }) {
  const { t } = useLocale();
  const [langs, setLangs] = useState<string[]>(initial.length ? initial : ["ja"]);
  const addable = availableLanguages(langs);

  const add = (code: string) => {
    if (code && !langs.includes(code)) setLangs([...langs, code]);
  };
  const remove = (code: string) => {
    if (langs.length <= 1) return;
    setLangs(langs.filter((l) => l !== code));
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
                onClick={() => remove(l)}
                aria-label={t("editor.removeLanguage")}
                className="rounded-full p-0.5 hover:bg-sage/20"
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
              onChange={(e) => {
                add(e.target.value);
                e.currentTarget.selectedIndex = 0;
              }}
              className="cursor-pointer appearance-none bg-transparent pr-1 focus:outline-none"
              aria-label={t("editor.addLanguage")}
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
    </div>
  );
}
