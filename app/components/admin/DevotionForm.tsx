"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Eye, Languages, Plus, Send, X } from "lucide-react";
import type { ContentItem, Locale, Localized, Visibility } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { localize } from "@/app/lib/i18n";
import { availableLanguages, languageName } from "@/app/lib/i18n/languages";
import { saveDevotion } from "@/app/lib/db/actions";
import {
  Button,
  Card,
  CardBody,
  Field,
  Input,
  ScriptureBlock,
  Select,
  Textarea,
} from "@/app/components/ui";
import { cn } from "@/app/lib/utils";
import { PastorAssistPanel } from "./PastorAssistPanel";

const VIS: Visibility[] = ["church", "prayer_team", "elders", "pastor_only"];

const nonEmpty = (s?: string) => Boolean(s && s.trim());
const LOC_FIELDS: (keyof Pick<ContentItem, "title" | "body" | "reflectionQuestion" | "prayerGuide" | "scriptureQuote">)[] = [
  "title",
  "body",
  "reflectionQuestion",
  "prayerGuide",
  "scriptureQuote",
];

/**
 * 初期の有効言語。既存なら本文に入っている言語、無ければ教会の配信言語（既定は1つ）。
 * 教会の配信言語を先頭側に並べる。
 */
function initialLanguages(initial: ContentItem | undefined, contentLanguages: string[]): string[] {
  const base = contentLanguages.length > 0 ? contentLanguages : ["ja"];
  if (!initial) return base;
  const present = new Set<string>();
  for (const f of LOC_FIELDS) {
    const v = initial[f] as Localized | undefined;
    if (v) for (const k of Object.keys(v)) if (nonEmpty(v[k])) present.add(k);
  }
  if (present.size === 0) return base;
  const ordered = base.filter((c) => present.has(c));
  const extras = [...present].filter((p) => !base.includes(p));
  return [...ordered, ...extras];
}

export function DevotionForm({
  locale,
  churchId,
  churchSlug,
  contentLanguages,
  initial,
  assistEnabled = false,
  visLabels,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  /** 教会が配信する言語（先頭が主言語・既定は1つ）。ここから初期の入力言語を決める。 */
  contentLanguages: string[];
  initial?: ContentItem;
  /** 教会設定 pastor_assist_enabled。true のとき AI 補助が対話的になる。 */
  assistEnabled?: boolean;
  /** 教会別の公開範囲の呼び方。省略時は標準ラベル。 */
  visLabels?: Partial<Record<Visibility, string>>;
}) {
  const { t } = useLocale();

  const [languages, setLanguages] = useState<string[]>(() =>
    initialLanguages(initial, contentLanguages),
  );
  const primary = languages[0] ?? contentLanguages[0] ?? "ja";
  const addable = availableLanguages(languages);

  const [date, setDate] = useState(initial?.devotionDate ?? "");
  const [scriptureRef, setScriptureRef] = useState(initial?.scriptureReference ?? "");
  const [translation, setTranslation] = useState(initial?.scriptureTranslation ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "church");
  const [scheduleAt, setScheduleAt] = useState(initial?.scheduledAt?.slice(0, 10) ?? "");
  const [saved, setSaved] = useState<null | "draft" | "scheduled" | "published">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 各テキストは Localized（言語→文字列）で保持。
  const [title, setTitle] = useState<Localized>(initial?.title ?? {});
  const [body, setBody] = useState<Localized>(initial?.body ?? {});
  const [refl, setRefl] = useState<Localized>(initial?.reflectionQuestion ?? {});
  const [prayer, setPrayer] = useState<Localized>(initial?.prayerGuide ?? {});
  const [quote, setQuote] = useState<Localized>(initial?.scriptureQuote ?? {});

  const clean = (v: Localized): Record<string, string> => {
    const o: Record<string, string> = {};
    for (const l of languages) if (nonEmpty(v[l])) o[l] = v[l]!;
    return o;
  };

  // AI 下書きをフォーム状態へマージ（置換ではなく合成。既存の編集を保つ）。
  // 保存はしない — 牧師が確認・編集してから Draft/Schedule/Publish を押す。
  const applyAssistDraft = (patch: {
    title?: Localized;
    body?: Localized;
    reflectionQuestion?: Localized;
    prayerGuide?: Localized;
  }) => {
    if (patch.title) setTitle((prev) => ({ ...prev, ...patch.title }));
    if (patch.body) setBody((prev) => ({ ...prev, ...patch.body }));
    if (patch.reflectionQuestion) setRefl((prev) => ({ ...prev, ...patch.reflectionQuestion }));
    if (patch.prayerGuide) setPrayer((prev) => ({ ...prev, ...patch.prayerGuide }));
  };

  const save = (status: "draft" | "scheduled" | "published") => {
    setError(null);
    startTransition(async () => {
      const res = await saveDevotion({
        id: initial?.id,
        churchId,
        churchSlug,
        locale,
        status,
        devotionDate: date || null,
        scheduledAt: status === "scheduled" ? scheduleAt || null : null,
        visibility,
        scriptureReference: scriptureRef || undefined,
        scriptureTranslation: translation || undefined,
        scriptureQuote: clean(quote),
        title: clean(title),
        body: clean(body),
        reflectionQuestion: clean(refl),
        prayerGuide: clean(prayer),
      });
      if (res.ok) setSaved(status);
      else setError(res.error);
    });
  };

  const addLanguage = (code: string) => {
    if (code && !languages.includes(code)) setLanguages([...languages, code]);
  };
  const removeLanguage = (l: string) => {
    if (languages.length <= 1) return;
    setLanguages(languages.filter((x) => x !== l));
  };

  // プレビューは 表示言語 → 主言語 → 利用可能な最初の言語 の順で解決。
  const preview = useMemo(() => {
    const pick = (v: Localized) => localize(v, locale, primary);
    return {
      title: pick(title),
      body: pick(body),
      refl: pick(refl),
      prayer: pick(prayer),
      quote: pick(quote),
    };
  }, [locale, primary, title, body, refl, prayer, quote]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* --- 編集フォーム --- */}
      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("editor.date")} htmlFor="dv-date">
                <Input id="dv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label={t("editor.visibility")} htmlFor="dv-vis">
                <Select id="dv-vis" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                  {VIS.map((v) => (
                    <option key={v} value={v}>
                      {visLabels?.[v] ?? t(`visibility.${v}`)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("editor.scriptureRef")} htmlFor="dv-ref">
                <Input id="dv-ref" value={scriptureRef} onChange={(e) => setScriptureRef(e.target.value)} placeholder="詩篇 121:1–2" />
              </Field>
              <Field label={t("editor.translation")} htmlFor="dv-tr">
                <Input id="dv-tr" value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="新改訳2017" />
              </Field>
            </div>

            {/* 配信する言語（既定は1言語） */}
            <div className="rounded-xl border border-line bg-mist/40 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                  <Languages className="h-4 w-4 text-sage-ink" aria-hidden />
                  {t("editor.languages")}
                </span>
                {languages.map((l, i) => (
                  <span
                    key={l}
                    className="inline-flex items-center gap-1 rounded-full border border-sage/40 bg-sage-soft px-2.5 py-1 text-xs font-medium text-sage-ink"
                  >
                    {languageName(l)}
                    {i === 0 ? null : (
                      <button
                        type="button"
                        onClick={() => removeLanguage(l)}
                        aria-label={t("editor.removeLanguage")}
                        className="rounded-full p-0.5 hover:bg-sage/20"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    )}
                  </span>
                ))}
                {addable.length > 0 ? (
                  <label className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-2 py-0.5 text-xs font-medium text-muted hover:bg-surface hover:text-ink">
                    <Plus className="h-3 w-3" aria-hidden />
                    <span className="sr-only">{t("editor.addLanguage")}</span>
                    <select
                      value=""
                      onChange={(e) => {
                        addLanguage(e.target.value);
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
              <p className="mt-2 text-xs text-muted text-balance-safe">{t("editor.singleLangNote")}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-5">
            <LangField label={t("editor.titleField")} value={title} setValue={setTitle} langs={languages} langName={languageName} single />
            <LangField label={t("editor.scriptureQuote")} value={quote} setValue={setQuote} langs={languages} langName={languageName} rows={2} hint={t("editor.scriptureQuoteHint")} />
            <LangField label={t("editor.body")} value={body} setValue={setBody} langs={languages} langName={languageName} rows={5} />
            <LangField label={t("editor.reflection")} value={refl} setValue={setRefl} langs={languages} langName={languageName} rows={2} />
            <LangField label={t("editor.prayer")} value={prayer} setValue={setPrayer} langs={languages} langName={languageName} rows={2} />
          </CardBody>
        </Card>

        {/* AI補助は「公開」とは別セクション（視覚的に分離） */}
        <PastorAssistPanel
          churchSlug={churchSlug}
          contentItemId={initial?.id}
          assistEnabled={assistEnabled}
          languages={languages}
          primary={primary}
          scriptureRef={scriptureRef}
          current={{ title, body, reflectionQuestion: refl, prayerGuide: prayer }}
          onApplyDraft={applyAssistDraft}
          actions={["assist.draftFromPassage", "assist.suggestQuestions", "assist.translate"]}
        />

        {/* --- 公開コントロール（AIとは別の、独立したフッター） --- */}
        <Card>
          <CardBody className="space-y-3">
            <p className="text-xs text-muted">{t("editor.publishNote")}</p>
            {saved ? (
              <p className="flex items-center gap-1.5 text-sm text-sage-ink" role="status">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {t(`status.${saved}`)} — {locale === "ja" ? "保存しました" : "saved"}
              </p>
            ) : null}
            {error ? <p className="text-sm text-rose-ink">{error}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              <Field label={t("editor.scheduleAt")} htmlFor="dv-sch" className="mr-auto">
                <Input id="dv-sch" type="date" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="w-44" />
              </Field>
              <Button variant="secondary" size="md" disabled={pending} onClick={() => save("draft")}>
                {t("common.saveDraft")}
              </Button>
              <Button variant="secondary" size="md" onClick={() => save("scheduled")} disabled={!scheduleAt || pending}>
                {t("common.schedule")}
              </Button>
              <Button size="md" disabled={pending} onClick={() => save("published")}>
                <Send className="h-4 w-4" aria-hidden />
                {t("common.publish")}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* --- 会員プレビュー --- */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          {t("editor.previewHeading")}
        </div>
        <Card>
          <CardBody className="space-y-4">
            <ScriptureBlock reference={scriptureRef} translation={translation} quote={preview.quote} />
            <h3 className="text-lg font-semibold text-ink text-balance-safe">
              {preview.title || (locale === "ja" ? "（タイトル未入力）" : "(untitled)")}
            </h3>
            {preview.body ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft text-balance-safe">
                {preview.body}
              </p>
            ) : null}
            {preview.refl ? (
              <div className="rounded-xl bg-mist p-3">
                <p className="text-xs font-medium text-sage-ink">{t("today.reflection")}</p>
                <p className="mt-1 text-sm text-ink text-balance-safe">{preview.refl}</p>
              </div>
            ) : null}
            {preview.prayer ? (
              <div className="rounded-xl border border-gold/25 bg-gold-soft/40 p-3">
                <p className="text-xs font-medium text-gold-ink">{t("today.guidedPrayer")}</p>
                <p className="mt-1 font-scripture text-sm text-ink text-balance-safe">{preview.prayer}</p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/** 有効な言語ぶんだけ入力欄を出す（1言語なら1列、2言語なら2列）。 */
function LangField({
  label,
  value,
  setValue,
  langs,
  langName,
  single,
  rows,
  hint,
}: {
  label: string;
  value: Localized;
  setValue: (v: Localized) => void;
  langs: string[];
  langName: (l: string) => string;
  single?: boolean;
  rows?: number;
  hint?: string;
}) {
  const set = (l: string, v: string) => setValue({ ...value, [l]: v });
  return (
    <div className={cn("grid gap-4", langs.length > 1 && "sm:grid-cols-2")}>
      {langs.map((l) => (
        <Field
          key={l}
          label={langs.length > 1 ? `${label} · ${langName(l)}` : label}
          hint={l === langs[0] ? hint : undefined}
        >
          {single ? (
            <Input value={value[l] ?? ""} onChange={(e) => set(l, e.target.value)} />
          ) : (
            <Textarea value={value[l] ?? ""} onChange={(e) => set(l, e.target.value)} rows={rows} />
          )}
        </Field>
      ))}
    </div>
  );
}
