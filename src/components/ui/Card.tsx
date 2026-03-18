import type { HTMLAttributes, PropsWithChildren } from "react";

export function Card({
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`rounded-[26px] border border-white/70 bg-white/92 shadow-panel backdrop-blur ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
