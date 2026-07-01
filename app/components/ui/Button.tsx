"use client";

import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonStyles";

/** クリック動作を持つボタン（デモの楽観的操作など）。 */
export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}
