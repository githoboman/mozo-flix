"use client";

import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Aceternity-style "moving border" button:
 * a glowing dot travels around the button perimeter, painting a soft border.
 * The button itself is a regular solid CTA — motion lives behind it.
 */
export function MovingBorderButton({
  children,
  onClick,
  duration = 3500,
  borderRadius = "0.5rem",
  className,
  containerClassName,
  glowClassName,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  duration?: number;
  borderRadius?: string;
  className?: string;
  containerClassName?: string;
  glowClassName?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative overflow-hidden bg-transparent p-[1.5px] disabled:opacity-50",
        containerClassName,
      )}
      style={{ borderRadius }}
    >
      <div className="absolute inset-0" style={{ borderRadius }}>
        <MovingBorder duration={duration} rx="30%" ry="30%">
          <div
            className={cn(
              "h-24 w-24 opacity-90",
              "[background:radial-gradient(circle,#ff8a3d_0%,rgba(255,107,0,0)_60%)]",
              glowClassName,
            )}
          />
        </MovingBorder>
      </div>
      <div
        className={cn(
          "relative flex items-center justify-center gap-2 bg-accent px-9 py-4 font-ui text-[14px] font-bold uppercase tracking-[0.08em] text-black transition group-hover:bg-accent-bright",
          className,
        )}
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        {children}
      </div>
    </button>
  );
}

function MovingBorder({
  children,
  duration = 3500,
  rx,
  ry,
}: {
  children: ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
}) {
  const pathRef = useRef<SVGRectElement | null>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength?.();
    if (!length) return;
    const pxPerMs = length / duration;
    progress.set((time * pxPerMs) % length);
  });

  const x = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val).x ?? 0,
  );
  const y = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val).y ?? 0,
  );

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full"
        width="100%"
        height="100%"
      >
        <rect
          fill="none"
          width="100%"
          height="100%"
          rx={rx}
          ry={ry}
          ref={pathRef}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        {children}
      </motion.div>
    </>
  );
}
