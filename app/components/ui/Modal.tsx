"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/app/lib/utils";

/** 確認モーダル（公開範囲の確認など）。Esc/背景クリックで閉じる。 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center whitespace-normal bg-ink/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          {title ? <h3 className="text-base font-semibold text-ink">{title}</h3> : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted hover:bg-mist hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mt-3 text-sm text-ink-soft text-balance-safe">{children}</div>
        {footer ? <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div> : null}
      </div>
    </div>
  );
}
