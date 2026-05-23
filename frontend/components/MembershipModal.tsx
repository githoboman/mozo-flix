"use client";

const TIERS = [
  {
    name: "Supporter",
    price: "5 STX / mo",
    perks: ["Ad-free viewing", "Early access to new videos", "Supporter badge"],
  },
  {
    name: "Pro",
    price: "15 STX / mo",
    perks: [
      "Everything in Supporter",
      "Exclusive members-only content",
      "Monthly Q&A invite",
      "2× reward multiplier",
    ],
  },
  {
    name: "Founder",
    price: "50 STX / mo",
    perks: [
      "Everything in Pro",
      "Direct creator DMs",
      "Co-creator credits",
      "DAO voting weight",
    ],
  },
];

export function MembershipModal({
  open,
  onClose,
  creator = "this creator",
}: {
  open: boolean;
  onClose: () => void;
  creator?: string;
}) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="animate-scale-in relative max-h-[90vh] w-[560px] max-w-[95vw] overflow-y-auto rounded-2xl border border-accent/25 bg-card p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
        <div className="mb-1 font-ui text-[10px] uppercase tracking-[0.2em] text-accent">
          Channel Membership
        </div>
        <div className="mb-6 font-display text-[28px] leading-none">
          Support <span className="text-accent">{creator}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col gap-4 rounded-xl border border-white/10 bg-surface p-5 transition hover:border-accent/40"
            >
              <div>
                <div className="font-ui text-[13px] font-bold uppercase tracking-[0.1em]">
                  {t.name}
                </div>
                <div className="font-display text-xl text-accent">{t.price}</div>
              </div>
              <ul className="flex-1 space-y-2">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[12px] font-light text-muted">
                    <span className="mt-0.5 text-accent">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  // TODO: @stacks/connect — STX recurring transfer
                  onClose();
                }}
                className="w-full rounded bg-accent py-2.5 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-accent-bright"
              >
                Join →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
