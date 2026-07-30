import Link from "next/link";
import {
  DocPage,
  DocH2,
  DocP,
  DocLink,
  DocCallout,
} from "@/components/docs/Prose";

export const metadata = {
  title: "Docs — MOZOflix",
  description:
    "Watch-to-earn video on Stacks. Learn how creators fund reward pools and how viewers get paid in STX for real attention.",
};

export default function DocsOverview() {
  return (
    <DocPage
      eyebrow="Documentation"
      title="Welcome to MOZOflix"
      intro="MOZOflix is a Bitcoin-secured, watch-to-earn video platform on Stacks. Creators fund reward pools; viewers earn STX for actually watching. Every payout is on-chain and verifiable."
    >
      <DocP>
        The docs are organised by what you&apos;re here to do. Start with{" "}
        <DocLink href="/docs/how-it-works">How it works</DocLink> if you want
        the mental model, jump to{" "}
        <DocLink href="/docs/viewers">For viewers</DocLink> if you&apos;re
        here to earn, or head to{" "}
        <DocLink href="/docs/creators">For creators</DocLink> if you&apos;re
        publishing.
      </DocP>

      <DocCallout>
        Everything below applies to the Stacks testnet deployment today.
        Mainnet is on the roadmap once contracts are audited. You can play
        with real (testnet) STX right now at{" "}
        <DocLink href="/browse">/browse</DocLink>.
      </DocCallout>

      <DocH2 id="the-loop">The loop, in one paragraph</DocH2>
      <DocP>
        A creator uploads a video, sets a reward per verified view (say
        1&nbsp;STX), and funds a pool up front (say 50&nbsp;STX). Viewers
        connect a Stacks wallet, watch to the completion threshold, and get
        paid straight from that pool by a smart contract — no ad networks,
        no algorithmic rugpulls. When the pool is empty, distribution stops.
        The creator can withdraw whatever&apos;s left at any time.
      </DocP>

      <DocH2 id="why-stacks">Why Stacks specifically</DocH2>
      <DocP>
        MOZOflix is built on Stacks because Bitcoin&apos;s finality gives
        creators a payment rail they don&apos;t have to trust us to
        maintain, and Clarity smart contracts let us do reward math that
        anyone can audit. See{" "}
        <DocLink href="/docs/contracts">Contracts & security</DocLink> for
        the specifics.
      </DocP>

      <DocH2 id="quick-links">Quick links</DocH2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { href: "/browse", label: "Browse videos", desc: "Start earning" },
          { href: "/upload", label: "Publish a video", desc: "Fund a pool" },
          { href: "/docs/faq", label: "FAQ", desc: "Common questions" },
          {
            href: "/docs/contracts",
            label: "Contracts",
            desc: "On-chain addresses",
          },
        ].map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block rounded-xl border border-accent-border bg-card p-4 transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="font-ui text-[13px] font-bold text-white">
                {l.label} →
              </div>
              <div className="mt-1 text-[12px] font-light text-muted">
                {l.desc}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </DocPage>
  );
}
