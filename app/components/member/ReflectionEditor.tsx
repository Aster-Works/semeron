"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { updateReflection } from "@/app/lib/db/actions";
import { Button, Callout, Textarea } from "@/app/components/ui";

/**
 * 自分の応答（reflection）の本文表示＋その場編集。
 * 作者本人のカードでのみ描画され、本文表示を編集ビューに切り替える。
 */
export function ReflectionEditor({
  churchId,
  churchSlug,
  contentId,
  initialBody,
  edited,
}: {
  churchId: string;
  churchSlug: string;
  contentId: string;
  initialBody: string;
  edited: boolean;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [draft, setDraft] = useState(initialBody);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const next = draft.trim();
    if (!next) return;
    setError(null);
    startTransition(async () => {
      const res = await updateReflection({ churchId, churchSlug, locale, contentId, body: next });
      if (res.ok) {
        setBody(next);
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus />
        {error ? <Callout tone="rose">{error}</Callout> : null}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              setDraft(body);
              setEditing(false);
              setError(null);
            }}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={save} disabled={pending || draft.trim().length === 0}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft text-balance-safe">{body}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setDraft(body);
            setEditing(true);
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-ink"
        >
          <PencilLine className="h-3.5 w-3.5" aria-hidden />
          {t("reflection.edit")}
        </button>
        {edited ? <span className="text-xs text-muted">· {t("reflection.edited")}</span> : null}
      </div>
    </div>
  );
}
