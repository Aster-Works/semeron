"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Smartphone } from "lucide-react";
import { Button, Callout } from "@/app/components/ui";
import {
  checkPushSupport,
  currentSubscriptionEndpoint,
  isIOS,
  isStandalone,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/app/lib/push/client";
import { deletePushSubscription, savePushSubscription } from "@/app/lib/db/actions";

type Lang = "ja" | "en";
const S = {
  ja: {
    title: "通知",
    desc: "今日のみことばや、あなたの祈祷課題への応答を、静かにお知らせします。",
    enable: "この端末で通知を受け取る",
    disable: "この端末の通知を止める",
    on: "この端末で通知を受け取っています。",
    working: "設定中…",
    unsupported: "このブラウザは通知に対応していません。",
    denied: "通知がブロックされています。ブラウザの設定から許可してください。",
    iosHint: "iPhone / iPad では、共有ボタンから「ホーム画面に追加」して、そこから開くと通知を受け取れます。",
    notConfigured: "この教会ではまだプッシュ通知が有効になっていません（受信箱には届きます）。",
    failed: "設定できませんでした。時間をおいて再度お試しください。",
  },
  en: {
    title: "Notifications",
    desc: "A quiet nudge for today's Word and for responses to your prayer requests.",
    enable: "Get notifications on this device",
    disable: "Turn off on this device",
    on: "You're receiving notifications on this device.",
    working: "Working…",
    unsupported: "This browser doesn't support notifications.",
    denied: "Notifications are blocked. Please allow them in your browser settings.",
    iosHint: "On iPhone / iPad, use Share → Add to Home Screen, then open it from there to receive notifications.",
    notConfigured: "Push isn't enabled for this church yet (you'll still see items in your Inbox).",
    failed: "Couldn't update. Please try again later.",
  },
} as const;

export function NotificationSettings({ locale, churchId }: { locale: Lang; churchId: string }) {
  const t = S[locale];
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [state, setState] = useState<
    "loading" | "unsupported" | "ios_not_standalone" | "denied" | "off" | "on"
  >("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const support = checkPushSupport();
      if (!support.supported) {
        if (!cancelled) setState(isIOS() && !isStandalone() ? "ios_not_standalone" : "unsupported");
        return;
      }
      if (isIOS() && !isStandalone()) {
        if (!cancelled) setState("ios_not_standalone");
        return;
      }
      if (support.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      const endpoint = await currentSubscriptionEndpoint();
      if (!cancelled) setState(endpoint ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(false);
    try {
      const sub = await subscribeToPush(vapidKey);
      if (!sub) {
        setState(Notification.permission === "denied" ? "denied" : "off");
        setError(Notification.permission !== "denied");
        return;
      }
      const res = await savePushSubscription(churchId, sub);
      if (!res.ok) {
        setError(true);
        return;
      }
      setState("on");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(false);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await deletePushSubscription(endpoint);
      setState("off");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-ink">{t.title}</p>
        <p className="mt-0.5 text-sm text-muted text-balance-safe">{t.desc}</p>
      </div>

      {state === "loading" ? (
        <p className="text-sm text-muted">…</p>
      ) : state === "unsupported" ? (
        <Callout tone="neutral">{t.unsupported}</Callout>
      ) : state === "ios_not_standalone" ? (
        <Callout tone="neutral" icon={Smartphone}>
          {t.iosHint}
        </Callout>
      ) : state === "denied" ? (
        <Callout tone="neutral">{t.denied}</Callout>
      ) : !vapidKey ? (
        <Callout tone="neutral">{t.notConfigured}</Callout>
      ) : state === "on" ? (
        <div className="space-y-2">
          <p className="text-sm text-sage-strong">{t.on}</p>
          <Button variant="ghost" size="sm" onClick={disable} disabled={busy}>
            <BellOff className="h-4 w-4" aria-hidden />
            {busy ? t.working : t.disable}
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={enable} disabled={busy}>
          <BellRing className="h-4 w-4" aria-hidden />
          {busy ? t.working : t.enable}
        </Button>
      )}

      {error ? <p className="text-sm text-rose-ink">{t.failed}</p> : null}
    </div>
  );
}
