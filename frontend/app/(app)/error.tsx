"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-segment error boundary for the (app) group.
 *
 * Catches render-time + effect errors anywhere under /browse, /watch,
 * /upload, etc. Without this, an unhandled exception (e.g. a third-party
 * SDK throwing on a mobile in-app browser) shows the default Next error
 * overlay in dev or a blank white screen in prod.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to console so the user can copy/paste if reporting
    console.error("[(app) error boundary]", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-6 pt-[120px] text-center">
      <span className="material-symbols-outlined mb-3 text-5xl text-accent">
        warning
      </span>
      <h1 className="mb-2 font-display text-h2 uppercase tracking-wide">
        Something went sideways
      </h1>
      <p className="mb-6 text-[13px] font-light leading-relaxed text-muted">
        The app hit an unexpected error.{" "}
        {error.message ? `(${error.message.slice(0, 140)})` : ""} Try reloading,
        or head back to the landing page.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-accent px-4 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-black hover:bg-accent-bright"
        >
          Retry
        </button>
        <Link
          href="/"
          className="rounded border border-white/15 px-4 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-white hover:border-accent hover:text-accent"
        >
          Back to landing
        </Link>
      </div>
    </main>
  );
}
