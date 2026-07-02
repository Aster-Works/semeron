"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { updatePassword } from "@/app/lib/db/actions";
import { Button, Callout, Card, CardBody, Field, Input } from "@/app/components/ui";

/** 新パスワード設定（リカバリーセッションが前提）。 */
export function ResetPasswordForm({ locale }: { locale: Locale }) {
  const ja = locale === "ja";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await updatePassword(password);
      if (!res.ok) {
        setError(
          ja
            ? "設定できませんでした。8文字以上で、以前と異なるパスワードをお試しください。"
            : "Could not update. Use at least 8 characters, different from your previous password.",
        );
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push(`/${locale}`);
        router.refresh();
      }, 1200);
    });
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        {done ? (
          <Callout tone="sage">
            {ja ? "パスワードを更新しました。移動します…" : "Password updated. Redirecting…"}
          </Callout>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="space-y-4"
          >
            <Field
              label={ja ? "新しいパスワード" : "New password"}
              htmlFor="rp-password"
              hint={ja ? "8文字以上" : "At least 8 characters"}
            >
              <Input id="rp-password" type="password" autoComplete="new-password" required
                minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>

            {error ? <Callout tone="rose">{error}</Callout> : null}

            <Button type="submit" fullWidth disabled={pending}>
              <KeyRound className="h-4 w-4" aria-hidden />
              {pending
                ? ja ? "設定中…" : "Updating…"
                : ja ? "パスワードを設定" : "Set password"}
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
