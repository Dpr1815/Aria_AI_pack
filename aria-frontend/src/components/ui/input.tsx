import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightElement, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-input border border-border bg-surface px-3 py-2.5",
              "text-sm text-text placeholder:text-text-muted",
              "outline-none transition-[border-color,box-shadow]",
              "duration-200 ease-out",
              "focus:border-primary focus:ring-1 focus:ring-primary/40",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !!leftIcon && "pl-10",
              !!rightElement && "pr-10",
              !!error && "border-error focus:border-error focus:ring-error/40",
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error && inputId ? `${inputId}-error` : undefined}
            {...props}
          />

          {rightElement && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </span>
          )}
        </div>

        {error && (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="text-xs text-error"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
