"use client";

const EXPLORER = "https://explorer.hiro.so/txid";

export type Tx = {
  date: string;
  video: string;
  amount: string;
  tx: string;
};

export function TxTable({ txs }: { txs: Tx[] }) {
  const exportCsv = () => {
    const rows = [
      ["Date", "Video", "Amount", "Tx"],
      ...txs.map((t) => [t.date, t.video, t.amount, t.tx]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mozoflix-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-accent-border bg-card">
      <div className="flex items-center justify-between border-b border-white/5 px-8 py-6">
        <h2 className="font-display text-h2">Transaction History</h2>
        <button
          onClick={exportCsv}
          className="font-ui text-[11px] uppercase tracking-[0.15em] text-accent hover:text-accent-bright"
        >
          Export CSV →
        </button>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="text-left font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
            <th className="px-8 py-4 font-semibold">Date</th>
            <th className="py-4 font-semibold">Video</th>
            <th className="py-4 font-semibold">Amount</th>
            <th className="px-8 py-4 text-right font-semibold">On-Chain</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((tx, i) => (
            <tr
              key={i}
              className="border-t border-white/5 transition hover:bg-white/[0.02]"
            >
              <td className="px-8 py-5 text-[13px] font-light text-muted">
                {tx.date}
              </td>
              <td className="py-5 text-[14px]">{tx.video}</td>
              <td className="py-5 font-ui text-[13px] text-accent">
                {tx.amount}
              </td>
              <td className="px-8 py-5 text-right">
                <a
                  href={`${EXPLORER}/${tx.tx}?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[12px] text-muted hover:text-accent"
                >
                  {tx.tx} ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
