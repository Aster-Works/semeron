"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileUp, ShieldAlert, Upload } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import type { MessageId } from "@/app/lib/i18n";
import { parseCsvObjects } from "@/app/lib/csv";
import { mapPrayerRows, type ImportResult } from "@/app/lib/demo/csv-import";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  Field,
  SensitiveFlags,
  Textarea,
  VisibilityBadge,
} from "@/app/components/ui";

const ERROR_KEY: Record<string, MessageId> = {
  title_required: "import.errTitleRequired",
  body_required: "import.errBodyRequired",
  title_body_required: "import.errTitleBodyRequired",
  bad_date: "import.errBadDate",
};

export function CsvImport({ locale }: { locale: Locale }) {
  const { t } = useLocale();
  const [text, setText] = useState("");
  const [imported, setImported] = useState<number | null>(null);

  const result: ImportResult | null = useMemo(() => {
    if (!text.trim()) return null;
    const { headers, rows } = parseCsvObjects(text);
    return mapPrayerRows(rows, headers);
  }, [text]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
    setImported(null);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-mist">
              <FileUp className="h-4 w-4" aria-hidden />
              {t("import.chooseFile")}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            <a
              href="/samples/prayer-requests-sample.csv"
              download
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-ink hover:underline"
            >
              <Download className="h-4 w-4" aria-hidden />
              {t("import.sample")}
            </a>
          </div>

          <Field label={t("import.paste")} htmlFor="csv-text" hint={t("import.formatNote")}>
            <Textarea
              id="csv-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setImported(null);
              }}
              placeholder={t("import.pastePlaceholder")}
              rows={5}
              className="font-mono text-xs"
            />
          </Field>
        </CardBody>
      </Card>

      {result?.fatal === "missing_columns" ? (
        <Callout tone="rose" icon={ShieldAlert}>
          {t("import.errMissingColumns")}
        </Callout>
      ) : null}

      {result && !result.fatal ? (
        <>
          <Callout tone="gold" icon={ShieldAlert} title={t("import.previewTitle")}>
            {t("import.safeNote")}
          </Callout>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="sage" icon={CheckCircle2}>
              {t("import.ready")}: {result.items.length} {t("import.rows")}
            </Badge>
            {result.errors.length > 0 ? (
              <Badge tone="rose" icon={ShieldAlert}>
                {t("import.needsAttention")}: {result.errors.length} {t("import.rows")}
              </Badge>
            ) : null}
          </div>

          {result.errors.length > 0 ? (
            <Card>
              <CardBody className="space-y-1.5">
                {result.errors.map((e) => (
                  <p key={`${e.rowNumber}-${e.message}`} className="text-sm text-rose-ink text-balance-safe">
                    {t("import.row")} {e.rowNumber}: {t(ERROR_KEY[e.message] ?? "import.needsAttention")}
                  </p>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {result.items.length > 0 ? (
            <div className="space-y-3">
              {result.items.map((item) => (
                <Card key={item.rowNumber} as="article">
                  <CardBody className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted">
                          {t("import.row")} {item.rowNumber}
                          {item.authorName ? ` · ${item.authorName}` : ""}
                          {item.anonymous ? ` · ${t("misc.anonymous")}` : ""}
                        </p>
                        <h3 className="text-base font-semibold text-ink text-balance-safe">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <VisibilityBadge visibility={item.visibility} locale={locale} />
                        {item.visibilityWasDefaulted ? (
                          <span className="text-[10px] text-muted">{t("import.defaulted")}</span>
                        ) : null}
                      </div>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft text-balance-safe">
                      {item.body}
                    </p>
                    {item.sensitiveFlags.length > 0 ? (
                      <SensitiveFlags flags={item.sensitiveFlags} locale={locale} />
                    ) : null}
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : null}

          {result.items.length > 0 ? (
            <Card>
              <CardBody className="space-y-3">
                {imported !== null ? (
                  <p className="flex items-center gap-1.5 text-sm text-sage-ink" role="status">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {imported} {t("import.done")}
                  </p>
                ) : (
                  <p className="text-xs text-muted text-balance-safe">{t("import.demoNote")}</p>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => setImported(result.items.length)}>
                    <Upload className="h-4 w-4" aria-hidden />
                    {t("import.doImport")} ({result.items.length})
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
