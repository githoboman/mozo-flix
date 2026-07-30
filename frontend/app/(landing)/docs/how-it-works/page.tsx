import {
  DocPage,
  DocH2,
  DocH3,
  DocP,
  DocLink,
  DocList,
  DocCode,
  DocCallout,
} from "@/components/docs/Prose";

export const metadata = {
  title: "How it works — MOZOflix Docs",
  description:
    "The mental model for watch-to-earn on Stacks: pools, thresholds, verified views, and instant on-chain payouts.",
};

export default function HowItWorks() {
  return (
    <DocPage
      eyebrow="Introduction"
      title="How it works"
      intro="Four moving parts: creators, videos, reward pools, and viewers. Each one has a well-defined on-chain contract behind it."
    >
      <DocH2 id="the-actors">The actors</DocH2>
      <DocList>
        <li>
          <strong className="text-white">Creator</strong> — publishes a video
          and funds its reward pool up front. Sets the reward per view and
          the minimum completion percentage (default 70%).
        </li>
        <li>
          <strong className="text-white">Viewer</strong> — connects a Stacks
          wallet, watches to the threshold, receives STX from the pool.
        </li>
        <li>
          <strong className="text-white">Platform</strong> — takes a small
          fee at fund time (currently 5%), escrowed transparently. See{" "}
          <DocLink href="/docs/contracts">Contracts & security</DocLink>.
        </li>
      </DocList>

      <DocH2 id="the-lifecycle">The lifecycle of a video</DocH2>
      <DocList ordered>
        <li>
          Creator uploads a video file (IPFS via Pinata), or pastes a
          YouTube or X URL.
        </li>
        <li>
          The client extracts 5 frames and runs them through an AI
          moderation classifier. Anything flagged for nudity, gore,
          extreme violence, hard drugs, or hate symbols is rejected here —
          nothing is pinned or broadcast on-chain.
        </li>
        <li>
          Creator sets a title, reward per view, and pool size. The client
          pins an IPFS manifest (title, description, source, thumbnail
          CID) and calls{" "}
          <DocCode>mozoflix-rewards-v2.register-and-fund</DocCode> in one
          atomic transaction. STX moves from the creator&apos;s wallet
          into the escrowed pool.
        </li>
        <li>
          Once the tx confirms, the video appears on{" "}
          <DocLink href="/browse">/browse</DocLink>.
        </li>
        <li>
          A viewer opens the video, watches past the completion gate. The
          player tracks <em>real</em> watch time, not scrub position — so
          skipping to the end doesn&apos;t trigger the reward.
        </li>
        <li>
          The client POSTs to <DocCode>/api/distribute-reward</DocCode>.
          The server signs and broadcasts{" "}
          <DocCode>distribute-reward(viewer, videoId, completion)</DocCode>.
          The contract verifies the wallet hasn&apos;t already claimed for
          this video, that the pool has funds, and that the video is
          active, then transfers STX out to the viewer.
        </li>
      </DocList>

      <DocH2 id="anti-fraud">Anti-fraud</DocH2>
      <DocP>
        Three defences work together:
      </DocP>
      <DocList>
        <li>
          <strong className="text-white">Honest watch time.</strong> The
          player counts only <DocCode>timeupdate</DocCode> deltas under 2.5
          seconds. Seeks and scrubs don&apos;t add to the counter.
        </li>
        <li>
          <strong className="text-white">One claim per wallet, forever.</strong>{" "}
          Enforced by the Clarity contract. Reloading the page, opening a
          new tab, or clearing storage won&apos;t re-trigger a payout.
        </li>
        <li>
          <strong className="text-white">Rate limits.</strong> The
          distribute endpoint is throttled per-IP and per-wallet before
          it&apos;s ever handed to the signer.
        </li>
      </DocList>
      <DocCallout kind="warning">
        Determined attackers can still spin up new wallets and use each one
        once. This is a Web3-shaped problem — solved long term with
        reputation and creator-side sybil controls (see the roadmap in{" "}
        <DocLink href="/docs/faq">FAQ</DocLink>).
      </DocCallout>

      <DocH3 id="what-a-view-is">What counts as a &ldquo;view&rdquo;</DocH3>
      <DocP>
        Whatever the creator sets as <DocCode>min-completion-pct</DocCode>{" "}
        (between 50% and 100%). Default is 70%. For YouTube embeds we poll
        the IFrame API for actual playback time; for X embeds, where
        playback isn&apos;t exposed to third parties, we use a
        visibility-gated timer that pauses when the tab or embed leaves
        the viewport.
      </DocP>
    </DocPage>
  );
}
