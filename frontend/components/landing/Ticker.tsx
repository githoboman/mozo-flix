const ITEMS = [
  "WATCH TO EARN",
  "BUILT ON STACKS",
  "BITCOIN SECURED",
  "VERIFIED ENGAGEMENT",
  "CREATOR ECONOMY",
  "ON-CHAIN REWARDS",
  "DECENTRALISED VIDEO",
];

export function Ticker() {
  const items = [...ITEMS, ...ITEMS]; // duplicated for seamless scroll
  return (
    <div className="overflow-hidden whitespace-nowrap bg-accent py-2.5">
      <div className="inline-block animate-ticker">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 px-8 font-display text-[14px] tracking-[0.1em] text-black"
          >
            {item}
            <span className="text-black/40">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
