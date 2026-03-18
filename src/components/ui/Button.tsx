import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border border-red-700 bg-red-600 text-white hover:bg-red-700",
  secondary: "border border-ink-900 bg-ink-900 text-white hover:bg-ink-800",
  ghost: "border border-ink-300 bg-white text-ink-700 hover:bg-ink-50",
  danger: "border border-red-800 bg-red-700 text-white hover:bg-red-800",
};

export function Button({
  variant = "ghost",
  className = "",
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
