"use client";

import { useState } from "react";

export function SubscribeButton({ initial = false }: { initial?: boolean }) {
  const [subbed, setSubbed] = useState(initial);

  return (
    <button
      onClick={() => setSubbed((v) => !v)}
      className={`flex items-center gap-2 rounded px-5 py-2.5 font-ui text-[12px] font-bold uppercase tracking-[0.1em] transition ${
        subbed
          ? "border border-white/10 bg-card-2 text-muted hover:border-accent hover:text-accent"
          : "bg-accent text-black hover:bg-accent-bright hover:shadow-glow"
      }`}
    >
      {subbed ? (
        <>
          <span className="material-symbols-outlined text-[16px]">
            notifications_active
          </span>
          Subscribed
        </>
      ) : (
        "+ Subscribe"
      )}
    </button>
  );
}
