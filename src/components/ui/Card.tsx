import type { HTMLAttributes, PropsWithChildren } from "react";

export function Card({
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`rounded-2xl border border-ink-200/50 bg-white/70 shadow-card backdrop-blur-xl animate-fade-in ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
