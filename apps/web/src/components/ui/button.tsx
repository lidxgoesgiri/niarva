import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out " +
  "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0";

const variants: Record<Variant, string> = {
  primary: "bg-cta text-cta-fg hover:bg-cta-hover shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]",
  secondary: "border border-line-strong bg-elevated text-ink hover:border-line-active hover:bg-raised",
  ghost: "text-ink-muted hover:bg-elevated hover:text-ink",
  danger: "border border-fail/50 bg-fail/10 text-fail hover:bg-fail/20",
};

// Minimum 44px touch target on the default and large sizes.
const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

/** A navigation action styled as a button. Rendered as a real link, never a clickable div. */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
