import { cn } from "@/app/lib/utils";

export type ButtonVariant =
  | "primary" // Sage: 主要動作（読みました / 承認して公開 など）
  | "secondary" // 枠線: 副次動作
  | "ghost" // 背景なし
  | "quiet" // 最も控えめ
  | "danger"; // Rose（柔らかい否定: 却下など）。赤で煽らない

export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-sage-strong text-white hover:bg-sage-ink focus-visible:outline-sage-ink",
  secondary:
    "border border-line-strong bg-surface text-ink hover:bg-mist focus-visible:outline-slate-ink",
  ghost: "text-ink hover:bg-mist focus-visible:outline-slate-ink",
  quiet: "text-muted hover:bg-mist hover:text-ink focus-visible:outline-slate-ink",
  danger:
    "border border-rose/40 bg-rose-soft text-rose-ink hover:bg-rose/15 focus-visible:outline-rose-ink",
};

const sizes: Record<ButtonSize, string> = {
  // タップ領域は 44px 以上（11 Accessibility）。sm も 44px を確保し、横幅で密度を調整する。
  sm: "h-11 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function buttonClass(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}): string {
  const { variant = "primary", size = "md", fullWidth, className } = opts ?? {};
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}
