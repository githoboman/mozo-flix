import type { ReactNode } from "react";

/**
 * Docs typography primitives. Centralising heading sizes, line-height,
 * link colour, and code styling here guarantees every doc page follows
 * the same visual rhythm — the single most impactful thing a design
 * system can do for a documentation surface.
 *
 * Rules baked in here:
 *  - One H1 per page (document title)
 *  - Body copy caps at 68ch for readability
 *  - Vertical rhythm on a 4-unit grid (space-y-4, space-y-6, etc.)
 *  - Every interactive element has a visible focus ring
 *  - Code is monospace + syntax-neutral (we don't ship highlighter JS)
 */

export function DocPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-[68ch]">
      {eyebrow && (
        <div className="mb-3 flex items-center gap-3 font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-6 bg-accent" />
          {eyebrow}
        </div>
      )}
      <h1 className="mb-4 font-display text-[clamp(36px,5vw,56px)] leading-[1.05] tracking-[0.01em]">
        {title}
      </h1>
      {intro && (
        <p className="mb-10 text-[17px] font-light leading-[1.7] text-muted">
          {intro}
        </p>
      )}
      <div className="doc-body space-y-6">{children}</div>
    </div>
  );
}

export function DocH2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-24 font-display text-[clamp(24px,3vw,32px)] leading-[1.15] tracking-[0.01em]"
    >
      {children}
    </h2>
  );
}

export function DocH3({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      className="mt-8 scroll-mt-24 font-ui text-[18px] font-bold uppercase tracking-[0.05em] text-white"
    >
      {children}
    </h3>
  );
}

export function DocP({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15px] font-light leading-[1.75] text-white/85">
      {children}
    </p>
  );
}

export function DocLink({
  href,
  children,
  external,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accent-bright hover:decoration-accent-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      {children}
      {external && (
        <span aria-hidden className="ml-0.5 text-[0.85em]">
          ↗
        </span>
      )}
    </a>
  );
}

export function DocList({
  children,
  ordered = false,
}: {
  children: ReactNode;
  ordered?: boolean;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={`space-y-2 pl-6 text-[15px] font-light leading-[1.7] text-white/85 marker:text-accent ${
        ordered ? "list-decimal" : "list-disc"
      }`}
    >
      {children}
    </Tag>
  );
}

export function DocCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-accent">
      {children}
    </code>
  );
}

export function DocPre({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 text-[13px] leading-[1.6]">
      <code className="font-mono text-white/85">{children}</code>
    </pre>
  );
}

/** Call-out box for important context — muted amber rather than red so
 *  it doesn't scream "error". */
export function DocCallout({
  kind = "note",
  children,
}: {
  kind?: "note" | "warning";
  children: ReactNode;
}) {
  const isWarn = kind === "warning";
  return (
    <div
      className={`rounded-lg border p-4 ${
        isWarn
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-accent/30 bg-accent-dim/40"
      }`}
    >
      <div className="mb-1 flex items-center gap-2 font-ui text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
        <span className="material-symbols-outlined text-[16px]">
          {isWarn ? "warning" : "lightbulb"}
        </span>
        {isWarn ? "Heads up" : "Note"}
      </div>
      <div className="text-[13px] font-light leading-[1.6] text-white/85">
        {children}
      </div>
    </div>
  );
}
