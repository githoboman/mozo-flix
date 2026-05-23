"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";

/**
 * Aceternity-inspired card with a soft accent spotlight that follows the cursor.
 * No framer-motion needed — we drive --mx / --my CSS vars on pointer move.
 */
export function SpotlightCard({
  children,
  className,
  radius = 320,
  color = "rgba(255,107,0,0.18)",
  border = true,
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
  color?: string;
  border?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onMouseMove={onMove}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-card-2 transition",
        border && "border border-accent-border hover:border-accent/40",
        className,
      )}
      style={
        {
          "--spot-r": `${radius}px`,
          "--spot-c": color,
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: visible ? 1 : 0,
          background:
            "radial-gradient(var(--spot-r) circle at var(--mx) var(--my), var(--spot-c), transparent 65%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
