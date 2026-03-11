import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";

const variantClassName: Record<ButtonVariant, string> = {
  default:
    "bg-[var(--brand)] text-white shadow-sm hover:bg-[color-mix(in_oklab,var(--brand)_86%,black)]",
  outline:
    "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--muted)]",
  ghost: "text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
};

export function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
        variantClassName[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
