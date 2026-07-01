import Link from "next/link";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonStyles";

/** リンクをボタンとして見せる（サーバーコンポーネントでも使える）。 */
export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}) {
  return (
    <Link
      href={href}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </Link>
  );
}
