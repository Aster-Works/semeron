"use client";

import { useRef, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { Button } from "@/app/components/ui";

/**
 * 招待ボタン: 招待リンク（/join/コード）を共有する。
 * モバイル等で Web Share が使えるときは共有シート、それ以外はクリップボードへコピー。
 */
export function InviteButton({
  locale,
  inviteCode,
  inviteCodeExpired = false,
  churchName,
}: {
  locale: Locale;
  inviteCode: string;
  inviteCodeExpired?: boolean;
  churchName: string;
}) {
  const { t } = useLocale();
  const ja = locale === "ja";
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expired = inviteCodeExpired;

  const invite = async () => {
    if (expired) return;
    const url = `${window.location.origin}/${locale}/join/${inviteCode}`;
    const text = ja
      ? `「${churchName}」の Semeron への招待です。リンクを開いて参加してください。`
      : `You're invited to join ${churchName} on Semeron.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Semeron", text, url });
        return;
      } catch (err) {
        // ユーザーが共有シートを閉じた場合(AbortError)は何もしない。
        // それ以外(デスクトップで share が使えない等)はコピーへフォールバック。
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不許可時は何もしない（コードは隣に表示されている）
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={invite} disabled={expired}>
      {copied ? <Check className="h-4 w-4 text-sage-ink" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
      {expired ? (ja ? "招待停止中" : "Invite expired") : copied ? (ja ? "リンクをコピーしました" : "Link copied") : t("members.invite")}
    </Button>
  );
}
