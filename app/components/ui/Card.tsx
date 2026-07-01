import { cn } from "@/app/lib/utils";

/** 紙のように静かに浮くカード。装飾グラデーションは使わない。 */
export function Card({
  className,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(23,32,38,0.04),0_8px_24px_-16px_rgba(23,32,38,0.15)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}
