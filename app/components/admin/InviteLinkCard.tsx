"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CalendarClock, Check, Copy, Link2, RefreshCw } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { expireInviteCode, rotateInviteCode } from "@/app/lib/db/actions";
import { Badge, Button, Callout, Modal } from "@/app/components/ui";

/**
 * 招待リンクの表示とコピー（管理 > 設定）。
 * 会員はこのリンクを開き、新規登録（またはGoogle）→ そのまま教会に参加できる。
 */
export function InviteLinkCard({
  locale,
  churchId,
  churchSlug,
  inviteCode,
  inviteCodeExpiresAt,
  inviteCodeRotatedAt,
  inviteCodeExpired = false,
  canEdit,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  inviteCode: string;
  inviteCodeExpiresAt?: string;
  inviteCodeRotatedAt?: string;
  inviteCodeExpired?: boolean;
  canEdit: boolean;
}) {
  const ja = locale === "ja";
  const router = useRouter();
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [confirming, setConfirming] = useState<"expire" | "rotate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const expired = inviteCodeExpired;

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/join/${inviteCode}`
      : `/${locale}/join/${inviteCode}`;

  const copy = async (kind: "link" | "code", value: string) => {
    if (expired) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard 不許可環境では選択コピーに任せる（値は画面に表示済み）
    }
  };

  const run = (kind: "expire" | "rotate") => {
    setError(null);
    startTransition(async () => {
      const res =
        kind === "expire"
          ? await expireInviteCode({ churchId, churchSlug, locale })
          : await rotateInviteCode({ churchId, churchSlug, locale });
      if (!res.ok) {
        setError(
          ja
            ? "招待コードを更新できませんでした。権限または接続状態を確認してください。"
            : "Could not update the invite code. Check permissions or connection.",
        );
        return;
      }
      setConfirming(null);
      router.refresh();
    });
  };

  const statusLabel = expired
    ? ja
      ? "失効済み"
      : "Expired"
    : ja
      ? "有効"
      : "Active";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <code
          className="rounded-lg border border-line bg-mist px-3 py-1.5 font-mono text-sm tracking-widest text-ink"
          data-testid="invite-code"
        >
          {inviteCode}
        </code>
        <span data-testid="invite-status">
          <Badge tone={expired ? "rose" : "sage"}>{statusLabel}</Badge>
        </span>
        <Button variant="ghost" size="sm" onClick={() => copy("code", inviteCode)} disabled={expired}>
          {copied === "code" ? <Check className="h-4 w-4 text-sage-ink" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied === "code" ? (ja ? "コピーしました" : "Copied") : (ja ? "コードをコピー" : "Copy code")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 truncate rounded-lg border border-line bg-mist px-3 py-1.5 text-xs text-ink-soft">
          {link}
        </p>
        <Button variant="secondary" size="sm" onClick={() => copy("link", link)} disabled={expired}>
          {copied === "link" ? <Check className="h-4 w-4 text-sage-ink" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
          {copied === "link" ? (ja ? "コピーしました" : "Copied") : (ja ? "招待リンクをコピー" : "Copy invite link")}
        </Button>
      </div>

      <div className="grid gap-2 text-xs text-muted sm:grid-cols-2">
        <p className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-sage-ink" aria-hidden />
          {ja ? "期限" : "Expires"}: {formatDate(inviteCodeExpiresAt, locale)}
        </p>
        <p className="flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5 text-sage-ink" aria-hidden />
          {ja ? "発行" : "Issued"}: {formatDate(inviteCodeRotatedAt, locale)}
        </p>
      </div>

      {expired ? (
        <Callout tone="rose">
          {ja
            ? "この招待リンクでは新しい参加はできません。必要なときは新しいコードを発行してください。"
            : "This invite link no longer accepts new members. Issue a new code when needed."}
        </Callout>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setError(null); setConfirming("rotate"); }}
          disabled={!canEdit || pending}
          data-testid="invite-rotate-open"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {ja ? "新しいコードを発行" : "Issue new code"}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => { setError(null); setConfirming("expire"); }}
          disabled={!canEdit || pending || expired}
          data-testid="invite-expire-open"
        >
          <Ban className="h-4 w-4" aria-hidden />
          {ja ? "今のコードを失効" : "Expire current code"}
        </Button>
      </div>

      <p className="text-xs text-muted text-balance-safe">
        {ja
          ? "招待リンクは期限つきです。漏えいした場合は失効し、新しいコードを発行してください。"
          : "Invite links are time-limited. If a code leaks, expire it and issue a new one."}
      </p>

      <Modal
        open={confirming !== null}
        onClose={() => (pending ? undefined : setConfirming(null))}
        title={
          confirming === "expire"
            ? ja
              ? "招待コードを失効しますか？"
              : "Expire this invite code?"
            : ja
              ? "新しい招待コードを発行しますか？"
              : "Issue a new invite code?"
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
              {ja ? "キャンセル" : "Cancel"}
            </Button>
            <Button
              variant={confirming === "expire" ? "danger" : "primary"}
              onClick={() => confirming && run(confirming)}
              disabled={pending}
              data-testid="invite-confirm"
            >
              {confirming === "expire" ? (
                <Ban className="h-4 w-4" aria-hidden />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden />
              )}
              {pending
                ? "..."
                : confirming === "expire"
                  ? ja
                    ? "失効する"
                    : "Expire"
                  : ja
                    ? "発行する"
                    : "Issue"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p>
            {confirming === "expire"
              ? ja
                ? "このコードでの新規参加を止めます。既存メンバーには影響しません。"
                : "This stops new joins with the current code. Existing members are not affected."
              : ja
                ? "現在のコードは使えなくなり、新しい30日間の招待コードに置き換わります。"
                : "The current code will stop working and be replaced with a new 30-day code."}
          </p>
          {error ? <p className="text-rose-ink">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}

function formatDate(value: string | undefined, locale: Locale): string {
  if (!value) return locale === "ja" ? "未設定" : "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "ja" ? "未設定" : "Not set";
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
