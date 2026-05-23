"use client";

import { useState } from "react";

export function ReadMore({
  text,
  limit = 180,
  className = "",
}: {
  text: string;
  limit?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const isLong = text.length > limit;
  const display = expanded || !isLong ? text : text.slice(0, limit).trimEnd() + "…";

  return (
    <div className={className}>
      <p className="whitespace-pre-line">{display}</p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 font-ui text-[11px] font-bold uppercase tracking-[0.15em] text-accent transition hover:text-accent-bright"
        >
          {expanded ? "Show less" : "Read more →"}
        </button>
      )}
    </div>
  );
}
