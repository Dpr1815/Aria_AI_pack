import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils";

const variantStyles = {
  primary:
    "bg-primary text-text-inverse hover:bg-primary-hover focus-visible:ring-primary",
  secondary:
    "bg-secondary text-text-inverse hover:bg-secondary-hover focus-visible:ring-secondary",
  outline:
    "border border-border-strong bg-transparent text-text hover:bg-surface focus-visible:ring-primary",
  ghost:
    "bg-transparent text-text hover:bg-surface focus-visible:ring-primary",
} as const;

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
} as const;

type Variant = keyof typeof variantStyles;
type Size = keyof typeof sizeStyles;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "rounded-button transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
