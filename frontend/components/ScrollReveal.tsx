"use client";

import { useInView } from "@/lib/useInView";

/**
 * Drop-in section wrapper that fades + slides up the first time it scrolls
 * into view. Disabled automatically when prefers-reduced-motion is set.
 */
export function ScrollReveal({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal${inView ? " in" : ""} ${className}`}>
      {children}
    </div>
  );
}
