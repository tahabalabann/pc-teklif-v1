import type { HTMLAttributes, PropsWithChildren } from "react";

export function Card({
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`rounded-2xl border border-white/70 bg-white/95 shadow-soft backdrop-blur ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
