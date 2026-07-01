"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button, Callout } from "@/app/components/ui";
import { isIOS, isStandalone } from "@/app/lib/push/client";

type Lang = "ja" | "en";
const S = {
  ja: {
    title: "ホーム画面に追加",
    desc: "アプリのように開けて、通知も受け取れます。",
    install: "ホーム画面に追加",
    installed: "この端末に追加済みです。",
    iosHint: "共有ボタン → 「ホーム画面に追加」を選んでください。",
  },
  en: {
    title: "Add to Home Screen",
    desc: "Open it like an app — and receive notifications.",
    install: "Add to Home Screen",
    installed: "Added to this device.",
    iosHint: "Tap Share → “Add to Home Screen.”",
  },
} as const;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt({ locale }: { locale: Lang }) {
  const t = S[locale];
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // 端末判定は client 限定（SSR は false のまま）。同期 setState を避け、
    // マイクロタスクで初期化してからリスナを張る。
    queueMicrotask(() => {
      if (cancelled) return;
      setStandalone(isStandalone());
      setIos(isIOS());
    });
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setStandalone(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // すでにインストール済みなら何も出さない（静かに）
  if (standalone) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-ink">{t.title}</p>
        <p className="mt-0.5 text-sm text-muted text-balance-safe">{t.desc}</p>
      </div>
      {deferred ? (
        <Button variant="secondary" size="sm" onClick={install}>
          <Download className="h-4 w-4" aria-hidden />
          {t.install}
        </Button>
      ) : ios ? (
        <Callout tone="neutral" icon={Share}>
          {t.iosHint}
        </Callout>
      ) : null}
    </div>
  );
}
