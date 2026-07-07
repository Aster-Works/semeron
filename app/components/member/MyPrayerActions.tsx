"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Sparkles, Trash2 } from "lucide-react";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { markPrayerAnswered, updatePrayerRequest, withdrawPrayerRequest } from "@/app/lib/db/actions";
import { Button, Callout, Field, Input, Modal, Textarea, Toggle } from "@/app/components/ui";
import { cn } from "@/app/lib/utils";

type Outcome = "open" | "answered" | "thanksgiving";

/**
 * 自分の祈祷課題の編集・取り下げ（作者本人のカードでのみ描画）。
 * - 公開済みを編集すると再審査（サーバー側で pending_review へ）。
 * - 匿名は sticky: 既に匿名なら外せない。未匿名なら「匿名にする」トグルを出す。
 */
export function MyPrayerActions({
  churchId,
  churchSlug,
  contentId,
  initialTitle,
  initialBody,
  isAnonymous,
  isPublished,
  initialOutcome = "open",
  initialNote = "",
}: {
  churchId: string;
  churchSlug: string;
  contentId: string;
  initialTitle: string;
  initialBody: string;
  isAnonymous: boolean;
  isPublished: boolean;
  initialOutcome?: Outcome;
  initialNote?: string;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [makeAnon, setMakeAnon] = useState(false);
  const [outcome, setOutcome] = useState<Exclude<Outcome, "open">>(
    initialOutcome === "thanksgiving" ? "thanksgiving" : "answered",
  );
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isAnswered = initialOutcome !== "open";

  const save = () => {
    if (!title.trim() || !body.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await updatePrayerRequest({
        churchId,
        churchSlug,
        locale,
        contentId,
        title: title.trim(),
        body: body.trim(),
        anonymous: isAnonymous || makeAnon,
      });
      if (res.ok) {
        setEditOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const withdraw = () => {
    setError(null);
    startTransition(async () => {
      const res = await withdrawPrayerRequest({ churchId, churchSlug, locale, contentId });
      if (res.ok) {
        setWithdrawOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const saveAnswer = () => {
    if (!note.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await markPrayerAnswered({ churchId, churchSlug, locale, contentId, outcome, note: note.trim() });
      if (res.ok) {
        setAnswerOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const reopen = () => {
    setError(null);
    startTransition(async () => {
      const res = await markPrayerAnswered({ churchId, churchSlug, locale, contentId, outcome: "open" });
      if (res.ok) {
        setAnswerOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-4 pt-1">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditOpen(true);
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-ink"
        >
          <PencilLine className="h-3.5 w-3.5" aria-hidden />
          {t("prayer.edit")}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setWithdrawOpen(true);
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-rose-ink"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {t("prayer.withdraw")}
        </button>
        {isPublished ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setAnswerOpen(true);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-sage-ink transition-colors hover:text-sage-strong"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {isAnswered ? t("prayer.editAnswered") : t("prayer.markAnswered")}
          </button>
        ) : null}
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("prayer.editTitle")}
        footer={
          <>
            <Button variant="quiet" onClick={() => setEditOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={save} disabled={pending || !title.trim() || !body.trim()}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {isPublished ? <Callout tone="gold">{t("prayer.editReReviewNote")}</Callout> : null}
          <Field label={t("prayerForm.titleLabel")} htmlFor="edit-pr-title" required>
            <Input
              id="edit-pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </Field>
          <Field label={t("prayerForm.bodyLabel")} htmlFor="edit-pr-body" required>
            <Textarea id="edit-pr-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
          </Field>
          {isAnonymous ? (
            <p className="text-xs text-muted text-balance-safe">{t("prayer.anonymousLocked")}</p>
          ) : (
            <Toggle
              id="edit-pr-anon"
              checked={makeAnon}
              onChange={setMakeAnon}
              label={t("prayerForm.anonymousLabel")}
            />
          )}
          {error ? <Callout tone="rose">{error}</Callout> : null}
        </div>
      </Modal>

      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title={t("prayer.withdrawTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={withdraw} disabled={pending}>
              {t("prayer.withdraw")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-soft text-balance-safe">{t("prayer.withdrawBody")}</p>
          {error ? <Callout tone="rose">{error}</Callout> : null}
        </div>
      </Modal>

      <Modal
        open={answerOpen}
        onClose={() => setAnswerOpen(false)}
        title={t("prayer.answeredModalTitle")}
        footer={
          <>
            {isAnswered ? (
              <Button variant="quiet" onClick={reopen} disabled={pending}>
                {t("prayer.reopen")}
              </Button>
            ) : (
              <Button variant="quiet" onClick={() => setAnswerOpen(false)} disabled={pending}>
                {t("common.cancel")}
              </Button>
            )}
            <Button onClick={saveAnswer} disabled={pending || !note.trim()}>
              {t("prayer.answeredSave")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t("prayer.answeredOutcomeLabel")}>
            <div className="grid grid-cols-2 gap-2">
              {(["answered", "thanksgiving"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOutcome(value)}
                  aria-pressed={outcome === value}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    outcome === value
                      ? "border-sage bg-sage-soft text-sage-ink ring-2 ring-sage/30"
                      : "border-line-strong bg-surface text-muted hover:text-ink",
                  )}
                >
                  {t(`outcome.${value}`)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t("prayer.answeredNoteLabel")} htmlFor="answered-note" required>
            <Textarea
              id="answered-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("prayer.answeredNotePlaceholder")}
              rows={4}
              maxLength={600}
            />
          </Field>
          <p className="text-xs text-muted text-balance-safe">{t("prayer.answeredNoteHint")}</p>
          {error ? <Callout tone="rose">{error}</Callout> : null}
        </div>
      </Modal>
    </>
  );
}
