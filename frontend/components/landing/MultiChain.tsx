"use client";

import { motion, useReducedMotion } from "framer-motion";

const CHAINS = [
  {
    id: "base",
    name: "Base",
    category: "L2 Scalability",
    desc: "The scalable EVM foundation. Secure, low-cost Layer 2 built on Ethereum for instant reward distributions without the gas fees.",
    icon: "layers",
    span: "md:col-span-2",
  },
  {
    id: "solana",
    name: "Solana",
    category: "High Throughput",
    desc: "Blazing fast execution and parallel processing designed for micro-rewards at a global scale.",
    icon: "bolt",
    span: "md:col-span-1",
  },
  {
    id: "stacks",
    name: "Stacks",
    category: "Bitcoin Finality",
    desc: "Smart contracts that settle on the most battle-tested chain in history. True on-chain ownership.",
    icon: "link",
    span: "md:col-span-1",
  },
];

export function LandingMultiChain() {
  const reduce = useReducedMotion();

  return (
    <section
      id="multi-chain"
      className="border-y border-accent-border bg-bg px-6 py-24 md:px-12"
    >
      <div className="mx-auto max-w-[1200px]">
        {/* Header */}
        <div className="mb-16 md:w-2/3">
          <div className="mb-4 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            <span className="material-symbols-outlined text-[14px]">
              hub
            </span>
            Omnichain Infrastructure
          </div>
          <h2 className="mb-6 font-display text-[clamp(36px,5vw,64px)] leading-[0.95] tracking-[0.02em] text-white">
            OPERATING ACROSS
            <br />
            <span className="text-accent">BASE, SOLANA & STACKS</span>
          </h2>
          <p className="text-[17px] font-light leading-[1.75] text-muted max-w-[65ch]">
            MOZOflix is built on a fully multi-chain architecture. Whether you prefer the deep liquidity of the EVM, the speed of Solana, or the security of Bitcoin, your rewards and identity follow you seamlessly.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {CHAINS.map((chain, i) => (
            <motion.div
              key={chain.id}
              initial={reduce ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.7,
                delay: i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`group relative overflow-hidden rounded-2xl border border-accent-border bg-surface p-8 transition-colors hover:border-accent/40 ${chain.span}`}
            >
              {/* Subtle accent glow on hover */}
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/5 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
              
              <div className="relative z-10 flex h-full flex-col justify-between gap-12">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-card transition-transform duration-500 group-hover:-translate-y-1">
                    <span className="material-symbols-outlined text-[24px] text-white">
                      {chain.icon}
                    </span>
                  </div>
                  <div className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 font-ui text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                    {chain.category}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 font-display text-3xl tracking-[0.02em] text-white">
                    {chain.name}
                  </h3>
                  <p className="text-[14px] font-light leading-[1.6] text-muted">
                    {chain.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
