"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, UserRoundPlus } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { createT } from "@/app/lib/i18n";
import { signInWithPassword, signUpWithPassword } from "@/app/lib/db/actions";
import { createClient } from "@/app/lib/supabase/client";
import { Button, Callout, Card, CardBody, Field, Input } from "@/app/components/ui";
import { cn } from "@/app/lib/utils";

/**
 * メール + パスワード認証（マジックリンクは廃止）+ Google OAuth。
 * 「新規登録」は即時サインアップ（教会への所属は招待コードが実際のゲート）。
 * Google ボタンは Supabase 側でプロバイダが有効なときだけ表示する
 * （/auth/v1/settings を確認。未設定なら自動的に非表示＝env 追加不要）。
 */
export function LoginForm({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const ja = locale === "ja";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
          headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
        });
        if (!res.ok) return;
        const json = (await res.json()) as { external?: { google?: boolean } };
        if (!cancelled && json.external?.google) setGoogleEnabled(true);
      } catch {
        // 到達不可などは静かに無視（パスワード認証は常に使える）
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/${locale}` },
      });
      if (oauthError) {
        setError(ja ? "Googleログインを開始できませんでした。" : "Could not start Google sign-in.");
        setGoogleBusy(false);
      }
      // 成功時は Google へリダイレクトされるため、ここには戻らない
    } catch {
      setError(ja ? "Googleログインを開始できませんでした。" : "Could not start Google sign-in.");
      setGoogleBusy(false);
    }
  };

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
                ? "このメールアドレスは登録済みです。ログインしてください。"
                : "This email is already registered. Please log in."
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
                ? ja ? "ログイン" : "Log in"
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
                ? ja ? "ログイン" : "Log in"
                : ja ? "アカウントを作成" : "Create account"}
          </Button>

          {mode === "signin" ? (
            <p className="text-right text-xs">
              <Link
                href={`/${locale}/forgot-password`}
                className="text-muted hover:text-ink hover:underline"
              >
                {ja ? "パスワードをお忘れですか？" : "Forgot your password?"}
              </Link>
            </p>
          ) : null}
        </form>

        {googleEnabled ? (
          <>
            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs text-muted">{ja ? "または" : "or"}</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={googleBusy || pending}
              className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-line-strong bg-surface text-sm font-medium text-ink transition-colors hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GoogleIcon />
              {googleBusy
                ? ja ? "Google へ移動中…" : "Redirecting to Google…"
                : ja ? "Google で続ける" : "Continue with Google"}
            </button>
            <p className="text-xs text-muted text-balance-safe">
              {ja
                ? "Google の場合、初回は自動でアカウントが作られます。"
                : "With Google, an account is created automatically on first sign-in."}
            </p>
          </>
        ) : null}

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

/** Google の "G" ロゴ（公式カラー・インラインSVG）。 */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
