import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.97] border-none",
  secondary:
    "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-[0.97]",
  ghost:
    "bg-transparent text-slate-400 hover:text-white hover:bg-white/5 active:scale-[0.97]",
  danger:
    "bg-gradient-to-r from-red-700 to-red-600 text-white shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.97]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
  xl: "px-8 py-4 text-lg font-black",
};

export function Button({
  variant = "ghost",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none 
      ${variantClasses[variant]} 
      ${sizeClasses[size]} 
      ${fullWidth ? 'w-full' : ''} 
      ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
