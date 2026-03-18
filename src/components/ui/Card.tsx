import type { HTMLAttributes, PropsWithChildren } from "react";

export function Card({
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={`rounded-xl border border-ink-200 bg-white shadow-panel ${className}`} {...props}>
      {children}
    </div>
  );
}
