"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { requestPasswordReset } from "@/app/lib/db/actions";
import { Button, Callout, Card, CardBody, Field, Input } from "@/app/components/ui";

/** パスワード再設定メールの送信フォーム。アカウントの有無は表示しない。 */
export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      await requestPasswordReset(email.trim(), locale);
      setSent(true);
    });
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        {sent ? (
          <Callout tone="sage" icon={Mail}>
            {ja
              ? "入力されたアドレス宛に再設定用のリンクを送りました（登録がある場合）。メールをご確認ください。届くまで数分かかることがあります。"
              : "If that address is registered, we've sent a reset link. Please check your email — it may take a few minutes."}
          </Callout>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="space-y-4"
          >
            <Field label={ja ? "メールアドレス" : "Email address"} htmlFor="fp-email">
              <Input id="fp-email" type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@church.example" />
            </Field>
            <Button type="submit" fullWidth disabled={pending}>
              <Mail className="h-4 w-4" aria-hidden />
              {pending
                ? ja ? "送信中…" : "Sending…"
                : ja ? "再設定リンクを送る" : "Send reset link"}
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
