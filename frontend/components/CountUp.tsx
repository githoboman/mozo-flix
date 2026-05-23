"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 → `value` over `duration` ms.
 * Accepts numbers OR numeric strings ("12.5"). Pass a `suffix` for "K", "+", etc.
 */
export function CountUp({
  value,
  duration = 1200,
  decimals,
  className = "",
}: {
  value: number | string;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const target = typeof value === "number" ? value : Number(value) || 0;
  const inferredDp =
    decimals ?? (typeof value === "string" && value.includes(".")
      ? value.split(".")[1]!.length
      : 0);

  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      // Re-animate from current value to new target on change
      const from = display;
      const start = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(from + (target - from) * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    startedRef.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: inferredDp,
    maximumFractionDigits: inferredDp,
  });
  return <span className={className}>{formatted}</span>;
}
