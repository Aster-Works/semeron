"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, TicketCheck } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { createChurch, joinChurch } from "@/app/lib/db/actions";
import { Button, Callout, Card, CardBody, Field, Input, Select } from "@/app/components/ui";
import { cn } from "@/app/lib/utils";

export function OnboardingForm({
  locale,
  initialMode = "create",
  initialCode = "",
}: {
  locale: Locale;
  initialMode?: "create" | "join";
  initialCode?: string;
}) {
  const router = useRouter();
  const ja = locale === "ja";
  const [mode, setMode] = useState<"create" | "join">(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // create
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [lang, setLang] = useState<Locale>(locale);
  const [tz, setTz] = useState(ja ? "Asia/Tokyo" : "America/Los_Angeles");
  // join
  const [code, setCode] = useState(initialCode);
  const [joinName, setJoinName] = useState("");

  const done = (slugValue: string) => {
    router.push(`/${locale}/church/${slugValue}/today`);
    router.refresh();
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      if (mode === "create") {
        const res = await createChurch({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          displayName: displayName.trim(),
          defaultLocale: lang,
          timezone: tz,
        });
        if (!res.ok) {
          // slug重複などのDBエラーを平易な文言に変換する
          const dup = /duplicate|unique|already exists/i.test(res.error);
          setError(
            dup
              ? ja
                ? "このURL識別子は既に使われています。別の識別子を入力してください（すでに教会を作成済みの場合は、トップページを開くとそのまま入れます）。"
                : "That URL identifier is already taken. Try another one (if you already created your church, just open the home page)."
              : res.error,
          );
          return;
        }
        done((res.data as { slug: string }).slug);
      } else {
        const res = await joinChurch(code.trim(), joinName.trim());
        if (!res.ok) {
          setError(ja ? "招待コードが正しくありません。" : "That invite code isn't valid.");
          return;
        }
        done((res.data as { slug: string }).slug);
      }
    });
  };

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="inline-flex rounded-full border border-line-strong bg-surface p-0.5 text-sm">
          {(["create", "join"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(null); }}
              className={cn("rounded-full px-3 py-1.5 font-medium transition-colors",
                mode === m ? "bg-ink text-paper" : "text-muted hover:text-ink")}>
              {m === "create" ? (ja ? "教会を作る" : "Create") : (ja ? "参加する" : "Join")}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          {mode === "create" ? (
            <>
              <Field label={ja ? "教会名" : "Church name"} htmlFor="cn" required>
                <Input id="cn" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder={ja ? "○○キリスト教会" : "Grace Community Church"} />
              </Field>
              <Field label={ja ? "URL の識別子（英数字）" : "URL slug"} htmlFor="cs" required
                hint={ja ? "例: eifuku-minami（あとで変更できません）" : "e.g. grace-community"}>
                <Input id="cs" required value={slug}
                  onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())} />
              </Field>
              <Field label={ja ? "あなたの表示名" : "Your display name"} htmlFor="dn" required>
                <Input id="dn" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={ja ? "既定の言語" : "Default language"} htmlFor="lg">
                  <Select id="lg" value={lang} onChange={(e) => setLang(e.target.value as Locale)}>
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </Select>
                </Field>
                <Field label={ja ? "タイムゾーン" : "Time zone"} htmlFor="tz">
                  <Input id="tz" value={tz} onChange={(e) => setTz(e.target.value)} />
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label={ja ? "招待コード" : "Invite code"} htmlFor="ic" required>
                <Input id="ic" required value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-widest" placeholder="EIFUKU-2026" />
              </Field>
              <Field label={ja ? "あなたの表示名" : "Your display name"} htmlFor="jn" required>
                <Input id="jn" required value={joinName} onChange={(e) => setJoinName(e.target.value)} />
              </Field>
            </>
          )}

          {error ? <Callout tone="rose">{error}</Callout> : null}

          <Button type="submit" fullWidth disabled={pending}>
            {mode === "create" ? <Building2 className="h-4 w-4" aria-hidden /> : <TicketCheck className="h-4 w-4" aria-hidden />}
            {pending ? (ja ? "処理中…" : "Working…") : mode === "create" ? (ja ? "教会を作成" : "Create church") : (ja ? "参加する" : "Join")}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
