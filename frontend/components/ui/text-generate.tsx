"use client";

import { motion, stagger, useAnimate } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Aceternity-style staggered word reveal. Each word fades in and slides up
 * with a small blur-to-clear transition. Good for hero headlines.
 */
export function TextGenerate({
  words,
  className,
  accentWords = [],
  duration = 0.6,
  delay = 0.04,
}: {
  words: string;
  className?: string;
  /** Words (case-sensitive) that should be rendered in the accent color. */
  accentWords?: string[];
  duration?: number;
  delay?: number;
}) {
  const [scope, animate] = useAnimate();
  const tokens = words.split(" ");

  useEffect(() => {
    animate(
      "span.tg-word",
      { opacity: 1, filter: "blur(0px)", y: 0 },
      { duration, delay: stagger(delay) },
    );
  }, [animate, duration, delay]);

  return (
    <motion.div ref={scope} className={cn("font-display", className)}>
      {tokens.map((w, i) => {
        const isAccent = accentWords.includes(w.replace(/[.,!?]$/g, ""));
        return (
          <span
            key={`${w}-${i}`}
            className={cn(
              "tg-word inline-block opacity-0",
              isAccent && "text-accent",
            )}
            style={{ filter: "blur(8px)", transform: "translateY(8px)" }}
          >
            {w}
            {i < tokens.length - 1 ? " " : ""}
          </span>
        );
      })}
    </motion.div>
  );
}
