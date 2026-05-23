"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info" | "loading";

export type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
  /** Optional CTA: {label, href} (link) or {label, onClick} (button) */
  action?:
    | { label: string; href: string }
    | { label: string; onClick: () => void };
  /** Lifetime in ms; 0 means sticky (caller must dismiss). Default depends on kind. */
  duration?: number;
};

type ToastContextValue = {
  show: (t: Omit<Toast, "id">) => string;
  update: (id: string, t: Partial<Omit<Toast, "id">>) => void;
  dismiss: (id: string) => void;
};

const Ctx = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const schedule = useCallback(
    (id: string, duration: number) => {
      if (duration <= 0) return;
      const t = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, t);
    },
    [dismiss],
  );

  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const defaultDuration =
        t.kind === "loading" ? 0 : t.kind === "error" ? 7000 : 4500;
      const toast: Toast = {
        id,
        ...t,
        duration: t.duration ?? defaultDuration,
      };
      setToasts((list) => [...list, toast]);
      schedule(id, toast.duration ?? 0);
      return id;
    },
    [schedule],
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<Toast, "id">>) => {
      setToasts((list) =>
        list.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      );
      // Reset timer if duration changed
      if (patch.duration !== undefined) {
        const t = timers.current.get(id);
        if (t) clearTimeout(t);
        timers.current.delete(id);
        if (patch.duration > 0) schedule(id, patch.duration);
      } else if (patch.kind && patch.kind !== "loading") {
        // Loading → success/error transition: auto-dismiss
        const t = timers.current.get(id);
        if (t) clearTimeout(t);
        schedule(id, patch.kind === "error" ? 7000 : 4500);
      }
    },
    [schedule],
  );

  useEffect(() => {
    const ref = timers.current;
    return () => {
      ref.forEach((t) => clearTimeout(t));
      ref.clear();
    };
  }, []);

  return (
    <Ctx.Provider value={{ show, update, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </Ctx.Provider>
  );
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-[300] flex max-w-[calc(100vw-2rem)] flex-col gap-2 sm:bottom-6 sm:right-6 sm:max-w-[420px]"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { kind, title, body, action } = toast;

  const colors: Record<ToastKind, string> = {
    success: "border-green-500/40 bg-green-500/10",
    error: "border-red-500/40 bg-red-500/10",
    info: "border-accent-border bg-card",
    loading: "border-accent/30 bg-accent-dim/30",
  };

  const icon: Record<ToastKind, string> = {
    success: "check_circle",
    error: "error",
    info: "info",
    loading: "progress_activity",
  };

  const iconColor: Record<ToastKind, string> = {
    success: "text-green-300",
    error: "text-red-300",
    info: "text-accent",
    loading: "text-accent animate-spin",
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md animate-fade-up ${colors[kind]}`}
    >
      <span
        className={`material-symbols-outlined shrink-0 text-[20px] ${iconColor[kind]}`}
      >
        {icon[kind]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-ui text-[13px] font-bold uppercase tracking-[0.08em] text-white">
          {title}
        </div>
        {body && (
          <div className="mt-0.5 break-words text-[12px] font-light text-muted">
            {body}
          </div>
        )}
        {action && (
          <div className="mt-2">
            {"href" in action ? (
              <a
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onDismiss}
                className="font-ui text-[10px] font-bold uppercase tracking-[0.15em] text-accent hover:text-accent-bright"
              >
                {action.label} →
              </a>
            ) : (
              <button
                onClick={() => {
                  action.onClick();
                  onDismiss();
                }}
                className="font-ui text-[10px] font-bold uppercase tracking-[0.15em] text-accent hover:text-accent-bright"
              >
                {action.label} →
              </button>
            )}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted hover:text-white"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
}
