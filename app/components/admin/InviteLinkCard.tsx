"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { Button } from "@/app/components/ui";

/**
 * 招待リンクの表示とコピー（管理 > 設定）。
 * 会員はこのリンクを開き、新規登録（またはGoogle）→ そのまま教会に参加できる。
 */
export function InviteLinkCard({ locale, inviteCode }: { locale: Locale; inviteCode: string }) {
  const ja = locale === "ja";
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/join/${inviteCode}`
      : `/${locale}/join/${inviteCode}`;

  const copy = async (kind: "link" | "code", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard 不許可環境では選択コピーに任せる（値は画面に表示済み）
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-lg border border-line bg-mist px-3 py-1.5 font-mono text-sm tracking-widest text-ink">
          {inviteCode}
        </code>
        <Button variant="ghost" size="sm" onClick={() => copy("code", inviteCode)}>
          {copied === "code" ? <Check className="h-4 w-4 text-sage-ink" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied === "code" ? (ja ? "コピーしました" : "Copied") : (ja ? "コードをコピー" : "Copy code")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 truncate rounded-lg border border-line bg-mist px-3 py-1.5 text-xs text-ink-soft">
          {link}
        </p>
        <Button variant="secondary" size="sm" onClick={() => copy("link", link)}>
          {copied === "link" ? <Check className="h-4 w-4 text-sage-ink" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
          {copied === "link" ? (ja ? "コピーしました" : "Copied") : (ja ? "招待リンクをコピー" : "Copy invite link")}
        </Button>
      </div>

      <p className="text-xs text-muted text-balance-safe">
        {ja
          ? "会員にこのリンクを共有してください。開くと新規登録（またはGoogleログイン）→ 表示名の入力だけで教会に参加できます。"
          : "Share this link with members. They sign up (or continue with Google), enter a display name, and join your church."}
      </p>
    </div>
  );
}
