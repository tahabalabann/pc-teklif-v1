import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-red-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-red-700",
  secondary: "bg-ink-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-ink-800",
  ghost: "bg-white/90 text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-white",
  danger: "bg-red-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-red-800",
};

export function Button({
  variant = "ghost",
  className = "",
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
