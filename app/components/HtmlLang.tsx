"use client";

import { useEffect } from "react";
import type { Locale } from "@/app/lib/demo/types";

/** ルート <html lang> はルートレイアウトで固定されるため、[locale] に合わせて更新する。 */
export function HtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
