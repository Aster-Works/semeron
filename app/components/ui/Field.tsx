"use client";

import { cn } from "@/app/lib/utils";

export function Field({
  label,
  hint,
  htmlFor,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
          {label}
          {required ? <span className="ml-1 text-rose-ink">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <p className="text-xs text-muted text-balance-safe">{hint}</p> : null}
    </div>
  );
}

const controlBase =
  // min-w-0: iOS Safari の input[type=date] が intrinsic min幅で w-full を無視し
  // 親からはみ出すのを防ぐ（全 input/select/textarea に効かせる）。
  "w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/30";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, "min-h-28 resize-y leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, "appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}

/** トグルスイッチ。タップ領域を大きく確保する。 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3.5 hover:bg-mist/50"
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-sage-strong" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink text-balance-safe">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted text-balance-safe">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
