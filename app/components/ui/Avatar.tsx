import { cn, initials } from "@/app/lib/utils";

/** イニシャルのアバター（画像なし・静かな配色）。匿名時は "?" 相当を渡す。 */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-cedar-soft font-medium text-cedar-ink",
        size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
