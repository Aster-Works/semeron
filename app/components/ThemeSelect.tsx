"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { menuSelectClass } from "@/app/components/menuSelectClass";

type Theme = "light" | "dark" | "system";

/** meta theme-color を現在の実効テーマに合わせる。 */
function applyTheme(choice: Theme) {
  const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = choice === "dark" || (choice === "system" && sysDark);
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#12181d" : "#FAF8F2");
}

function readStored(): Theme {
  try {
    const v = localStorage.getItem("semeron-theme");
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/**
 * テーマ選択（ライト / ダーク / システム）。設定メニュー内のドロップダウン。
 * - 実効テーマは `.dark` クラスで表現（layout の初期化スクリプトと対）。
 * - "system" は OS 設定に追従し、OS 変更にもリアルタイムで反応する。
 */
export function ThemeSelect() {
  const { t } = useLocale();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setTheme(readStored());
    });
    // system 選択時は OS の切替に追従する
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onOsChange = () => {
      if (readStored() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onOsChange);
    return () => {
      cancelled = true;
      mq.removeEventListener("change", onOsChange);
    };
  }, []);

  const onSelect = (v: Theme) => {
    setTheme(v);
    try {
      localStorage.setItem("semeron-theme", v);
    } catch {
      // プライベートブラウズ等で保存できなくても切替は反映する
    }
    applyTheme(v);
  };

  return (
    <select
      value={theme}
      onChange={(e) => onSelect(e.target.value as Theme)}
      aria-label={t("settings.theme")}
      className={menuSelectClass}
    >
      <option value="light">{t("settings.theme.light")}</option>
      <option value="dark">{t("settings.theme.dark")}</option>
      <option value="system">{t("settings.theme.system")}</option>
    </select>
  );
}
