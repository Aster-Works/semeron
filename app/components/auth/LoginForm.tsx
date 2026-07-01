"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UserRoundPlus } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { createT } from "@/app/lib/i18n";
import { signInWithPassword, signUpWithPassword } from "@/app/lib/db/actions";
import { Button, Callout, Card, CardBody, Field, Input } from "@/app/components/ui";
import { cn } from "@/app/lib/utils";

/**
 * メール + パスワード認証（マジックリンクは廃止）。
 * 「新規登録」は即時サインアップ（教会への所属は招待コードが実際のゲート）。
 */
export function LoginForm({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ja = locale === "ja";

  const submit = () => {
    setError(null);
    startTransition(async () => {
      if (mode === "signin") {
        const res = await signInWithPassword(email.trim(), password);
        if (!res.ok) {
          setError(ja ? "メールまたはパスワードが正しくありません。" : "Invalid email or password.");
          return;
        }
      } else {
        const res = await signUpWithPassword(email.trim(), password);
        if (!res.ok) {
          setError(
            res.error.includes("already")
              ? ja
                ? "このメールアドレスは登録済みです。サインインしてください。"
                : "This email is already registered. Please sign in."
              : ja
                ? "登録できませんでした。パスワードは8文字以上にしてください。"
                : "Could not sign up. Use a password of at least 8 characters.",
          );
          return;
        }
      }
      router.push(`/${locale}`);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="inline-flex rounded-full border border-line-strong bg-surface p-0.5 text-sm">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); }}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-colors",
                mode === m ? "bg-ink text-paper" : "text-muted hover:text-ink",
              )}
            >
              {m === "signin"
                ? ja ? "サインイン" : "Sign in"
                : ja ? "新規登録" : "Create account"}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="space-y-4"
        >
          <Field label={t("login.email")} htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@church.example" />
          </Field>
          <Field
            label={ja ? "パスワード" : "Password"}
            htmlFor="password"
            hint={mode === "signup" ? (ja ? "8文字以上" : "At least 8 characters") : undefined}
          >
            <Input id="password" type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required minLength={mode === "signup" ? 8 : undefined}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>

          {error ? <Callout tone="rose">{error}</Callout> : null}

          <Button type="submit" fullWidth disabled={pending}>
            {mode === "signin"
              ? <KeyRound className="h-4 w-4" aria-hidden />
              : <UserRoundPlus className="h-4 w-4" aria-hidden />}
            {pending
              ? ja ? "処理中…" : "Working…"
              : mode === "signin"
                ? ja ? "サインイン" : "Sign in"
                : ja ? "アカウントを作成" : "Create account"}
          </Button>
        </form>

        {mode === "signup" ? (
          <p className="text-xs text-muted text-balance-safe">
            {ja
              ? "アカウント作成後、教会を新しく作るか、招待コードで教会に参加します。"
              : "After creating an account, you can start a church or join one with an invite code."}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
