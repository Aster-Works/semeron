"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/app/lib/utils";

/**
 * ダークモード切替スイッチ（歯車メニュー内）。
 * - html.dark の付け外し + localStorage('semeron-theme') に保存。
 * - 未操作時は OS 設定に従う（layout.tsx の初期化スクリプトと対）。
 * - SSR とのちらつきを避けるため、状態はマウント後に DOM から読む。
 */
export function ThemeToggle({ label }: { label: string }) {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // 現在のテーマは DOM（初期化スクリプトが確定済み）から読む。
    // 同期 setState を避けてマイクロタスクで反映する。
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
      // プライベートブラウズ等で保存できなくても切替自体は有効にする
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next ? "#12181d" : "#FAF8F2");
    setIsDark(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark ?? false}
      aria-label={label}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        isDark ? "bg-sage-strong" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition-transform",
          isDark ? "translate-x-5" : "translate-x-0.5",
        )}
      >
        {/* ノブは常に白なので、アイコンは両モードで読める固定トーン（装飾用途） */}
        {isDark ? (
          <Moon className="h-3 w-3 text-slate" aria-hidden />
        ) : (
          <Sun className="h-3 w-3 text-gold" aria-hidden />
        )}
      </span>
    </button>
  );
}
