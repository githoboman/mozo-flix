"use client";

import { useEffect, useState } from "react";

type Suggestion = {
  title: string;
  description: string;
  category: string;
  tags: string[];
};

/**
 * Fires automatically whenever `file` changes. Hits /api/ai/suggest-metadata
 * with the filename + creator's optional brief, then surfaces inline Accept
 * controls that call back into the upload form's setters.
 */
export function AIUploadAssistant({
  file,
  freeformHint,
  creatorHandle,
  onApply,
}: {
  file: File | null;
  freeformHint?: string;
  creatorHandle?: string;
  onApply: (s: Suggestion) => void;
}) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ready"; suggestion: Suggestion }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [autoFiredFor, setAutoFiredFor] = useState<string | null>(null);

  const run = async (override?: string) => {
    if (!file) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/ai/suggest-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          durationSeconds: await readDuration(file).catch(() => undefined),
          creatorHandle,
          freeformHint: override ?? freeformHint,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI failed");
      setState({ kind: "ready", suggestion: data });
    } catch (e) {
      setState({ kind: "error", message: friendlyAIError((e as Error).message) });
    }
  };

  // Auto-run once per new file
  useEffect(() => {
    if (!file) return;
    const key = `${file.name}:${file.size}`;
    if (autoFiredFor === key) return;
    setAutoFiredFor(key);
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.name, file?.size]);

  if (!file) return null;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-dim/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="material-symbols-outlined text-[14px]">
            auto_awesome
          </span>
          AI Upload Assistant
        </div>
        {state.kind === "ready" && (
          <button
            type="button"
            onClick={() => run()}
            className="font-ui text-[10px] uppercase tracking-[0.1em] text-muted hover:text-accent"
          >
            ↻ Regenerate
          </button>
        )}
      </div>

      {state.kind === "loading" && (
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-accent" />
          Analyzing &ldquo;{file.name}&rdquo;…
        </div>
      )}

      {state.kind === "error" && (
        <div className="space-y-2">
          <div className="text-[12px] text-red-300">{state.message}</div>
          <button
            type="button"
            onClick={() => run()}
            className="rounded border border-white/10 px-3 py-1 font-ui text-[10px] uppercase tracking-[0.1em] text-muted hover:text-accent"
          >
            Retry
          </button>
        </div>
      )}

      {state.kind === "ready" && (
        <div className="space-y-3">
          <Row label="Title">
            <div className="text-[14px] font-semibold text-white">
              {state.suggestion.title}
            </div>
          </Row>
          <Row label="Description">
            <div className="text-[12px] font-light leading-[1.6] text-muted">
              {state.suggestion.description}
            </div>
          </Row>
          <Row label="Category">
            <span className="inline-block rounded bg-accent-dim px-2 py-0.5 font-ui text-[10px] uppercase tracking-[0.1em] text-accent">
              {state.suggestion.category}
            </span>
          </Row>
          {state.suggestion.tags.length > 0 && (
            <Row label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {state.suggestion.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-surface px-2 py-0.5 text-[10px] text-muted"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </Row>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => onApply(state.suggestion)}
              className="rounded bg-accent px-4 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.1em] text-black hover:bg-accent-bright"
            >
              ✓ Accept All
            </button>
            <button
              type="button"
              onClick={() => setState({ kind: "idle" })}
              className="rounded border border-white/10 px-4 py-2 font-ui text-[11px] uppercase tracking-[0.1em] text-muted hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 font-ui text-[9px] uppercase tracking-[0.15em] text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

/**
 * Translate raw provider error blobs into a single human sentence.
 * The API route already does this for known codes, but we belt-and-brace
 * the client so a cached old response or pre-deploy build can't leak
 * Anthropic JSON into the UI.
 */
function friendlyAIError(raw: string): string {
  if (/invalid x-api-key/i.test(raw) || /Anthropic 401/.test(raw)) {
    return "AI assistant is offline — the Anthropic API key is invalid or revoked. Generate a new key at console.anthropic.com and update ANTHROPIC_API_KEY in your deployment.";
  }
  if (/Anthropic 429/.test(raw) || /rate.?limit/i.test(raw)) {
    return "AI assistant is rate-limited. Try again in a minute.";
  }
  if (/ANTHROPIC_API_KEY missing/.test(raw)) {
    return "AI assistant isn't configured on this deployment.";
  }
  if (/Anthropic 5\d\d/.test(raw)) {
    return "AI provider is having an outage. Try again shortly.";
  }
  // Strip JSON-looking blobs that leaked through any other branch
  if (raw.length > 160 || raw.includes("{") || raw.includes("\"type\"")) {
    return "AI suggestion failed. You can fill in the title and description manually.";
  }
  return raw;
}

/** Reads media duration without uploading the file. */
async function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("metadata read failed"));
    };
    v.src = url;
  });
}
