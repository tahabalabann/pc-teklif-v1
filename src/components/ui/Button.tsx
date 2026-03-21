import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 text-white shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.97]",
  secondary:
    "bg-ink-900 text-white shadow-sm hover:bg-ink-800 hover:shadow-md active:scale-[0.97]",
  ghost:
    "bg-white/70 backdrop-blur-sm text-ink-700 ring-1 ring-inset ring-ink-200/70 hover:bg-white hover:ring-ink-300 hover:shadow-sm active:scale-[0.97]",
  danger:
    "bg-gradient-to-r from-red-700 to-red-600 text-white shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.97]",
};

export function Button({
  variant = "ghost",
  className = "",
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
