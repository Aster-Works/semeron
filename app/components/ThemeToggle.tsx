"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/app/lib/utils";

/**
 * テーマ切替（ライト ⇄ ダーク）のトグルスイッチ。設定メニュー内。
 * - checked = ダーク。html.dark と localStorage('semeron-theme'='light'|'dark') を更新。
 * - 未操作の初回は layout の初期化スクリプトが OS 設定に従う（このトグルを一度
 *   操作すると 'light'/'dark' が明示保存され、以後はその選択が優先される）。
 * - 状態は SSR とのちらつきを避けるためマウント後に DOM から読む。
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setIsDark(document.documentElement.classList.contains("dark"));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = () => {
    const next = !(isDark ?? false);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("semeron-theme", next ? "dark" : "light");
    } catch {
      // プライベートブラウズ等で保存できなくても切替は反映する
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next ? "#12181d" : "#FAF8F2");
    setIsDark(next);
  };

  const dark = isDark ?? false;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "ダーク" : "ライト"}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        dark ? "bg-sage-strong" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition-transform",
          dark ? "translate-x-5" : "translate-x-0.5",
        )}
      >
        {dark ? (
          <Moon className="h-3 w-3 text-slate" aria-hidden />
        ) : (
          <Sun className="h-3 w-3 text-gold" aria-hidden />
        )}
      </span>
    </button>
  );
}
