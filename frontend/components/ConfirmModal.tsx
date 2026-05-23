"use client";

export function ConfirmModal({
  open,
  onClose,
  title,
  body,
  confirmLabel = "Confirm",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
}) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="animate-scale-in relative w-[440px] max-w-[92vw] rounded-2xl border border-accent/25 bg-card p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
        <div className="mb-3 font-display text-[28px] leading-none">{title}</div>
        <div className="mb-6 text-[13px] font-light leading-[1.7] text-muted">
          {body}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded border border-white/10 py-3 font-ui text-[11px] uppercase tracking-[0.1em] text-muted hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className="flex-1 rounded bg-accent py-3 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-black hover:bg-accent-bright"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
