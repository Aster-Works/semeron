"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { createT } from "@/app/lib/i18n";
import { signInWithMagicLink, signInWithPassword } from "@/app/lib/db/actions";
import { Button, Callout, Card, CardBody, Field, Input } from "@/app/components/ui";
import { cn } from "@/app/lib/utils";

export function LoginForm({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      if (mode === "password") {
        const res = await signInWithPassword(email.trim(), password);
        if (!res.ok) {
          setError(locale === "ja" ? "メールまたはパスワードが正しくありません。" : "Invalid email or password.");
          return;
        }
        router.push(`/${locale}`);
        router.refresh();
      } else {
        const res = await signInWithMagicLink(email.trim());
        if (!res.ok) setError(res.error);
        else setSent(true);
      }
    });
  };

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="inline-flex rounded-full border border-line-strong bg-surface p-0.5 text-sm">
          {(["password", "magic"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); setSent(false); }}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-colors",
                mode === m ? "bg-ink text-paper" : "text-muted hover:text-ink",
              )}
            >
              {m === "password"
                ? locale === "ja" ? "パスワード" : "Password"
                : locale === "ja" ? "マジックリンク" : "Magic link"}
            </button>
          ))}
        </div>

        {sent ? (
          <Callout tone="sage" icon={Mail}>
            {locale === "ja"
              ? "ログイン用リンクをメールに送りました。メールをご確認ください。"
              : "We sent you a sign-in link. Please check your email."}
          </Callout>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="space-y-4"
          >
            <Field label={t("login.email")} htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@church.example" />
            </Field>
            {mode === "password" ? (
              <Field label={locale === "ja" ? "パスワード" : "Password"} htmlFor="password">
                <Input id="password" type="password" autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            ) : null}

            {error ? <Callout tone="rose">{error}</Callout> : null}

            <Button type="submit" fullWidth disabled={pending}>
              {mode === "password" ? <KeyRound className="h-4 w-4" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
              {pending
                ? locale === "ja" ? "処理中…" : "Working…"
                : mode === "password"
                  ? locale === "ja" ? "サインイン" : "Sign in"
                  : t("login.magicLink")}
            </Button>
          </form>
        )}

        <p className="text-xs text-muted text-balance-safe">
          {locale === "ja"
            ? "ローカル検証用アカウント: jimi@eifuku.example（牧師）/ taro@eifuku.example（会員）ほか、パスワードはすべて password123"
            : "Local test accounts: jimi@eifuku.example (pastor) / taro@eifuku.example (member), etc. Password: password123"}
        </p>
      </CardBody>
    </Card>
  );
}
