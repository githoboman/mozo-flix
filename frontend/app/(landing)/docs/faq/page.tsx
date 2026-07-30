import {
  DocPage,
  DocH2,
  DocP,
  DocLink,
} from "@/components/docs/Prose";

export const metadata = {
  title: "FAQ — MOZOflix Docs",
  description:
    "Common questions about earning, publishing, wallets, and how MOZOflix works.",
};

export default function FaqDoc() {
  return (
    <DocPage
      eyebrow="Reference"
      title="Frequently asked questions"
    >
      <DocH2 id="is-this-real-money">Is this real money?</DocH2>
      <DocP>
        The platform is currently on Stacks testnet. STX earned on testnet
        has no fiat value — it&apos;s the equivalent of playing on a
        sandbox. Mainnet launch is on the roadmap once contracts are
        audited. Everything you learn now will work identically on
        mainnet.
      </DocP>

      <DocH2 id="do-i-need-btc">Do I need Bitcoin to use MOZOflix?</DocH2>
      <DocP>
        No. You need a Stacks wallet, but rewards are denominated in STX,
        not BTC. Long term, we plan to support sBTC-denominated rewards so
        creators can pay in Bitcoin without leaving Stacks.
      </DocP>

      <DocH2 id="creator-earnings">
        How much does a creator earn from ads?
      </DocH2>
      <DocP>
        Zero. There are no ads on MOZOflix. Creators fund a reward pool up
        front; viewers get paid out of it. The economic loop is: pay
        directly for verified attention, capture that attention as an
        audience and follow-on funding, not as ad spend.
      </DocP>

      <DocH2 id="how-is-a-view-verified">How is a view verified?</DocH2>
      <DocP>
        The player counts <em>real playback deltas</em> — small
        timeupdate ticks that only fire during actual playback. Seeking or
        scrubbing produces large deltas that we ignore. The reward fires
        only when accumulated real watch time crosses the creator&apos;s
        completion threshold (default 70%). Full detail in{" "}
        <DocLink href="/docs/how-it-works">How it works</DocLink>.
      </DocP>

      <DocH2 id="what-if-pool-empty">
        What if I watch and the pool is empty?
      </DocH2>
      <DocP>
        You still see the video — it plays exactly the same — but the
        reward call fails with &ldquo;pool empty&rdquo;. The pool balance
        is shown on the watch page so you can see before you commit the
        time.
      </DocP>

      <DocH2 id="can-i-earn-twice">
        Can I earn from the same video twice?
      </DocH2>
      <DocP>
        No. The Clarity contract records each viewer&apos;s claim per
        video. Rewatching is welcome — the reward just fires only the
        first time.
      </DocP>

      <DocH2 id="mobile-wallets">Do wallets work on mobile?</DocH2>
      <DocP>
        Yes, but not via a mobile browser&apos;s address bar — wallet
        extensions only work on desktop. On mobile, open MOZOflix inside
        the Xverse or Leather app&apos;s built-in browser. The Connect
        modal detects mobile and offers a one-tap &ldquo;Open in
        Xverse&rdquo; deep link.
      </DocP>

      <DocH2 id="youtube-videos">Can I upload YouTube videos I don&apos;t own?</DocH2>
      <DocP>
        MOZOflix has no way to police copyright at upload time. If you
        post someone else&apos;s content and they report it, the video
        gets hidden and the pool can be slashed. Publishing content you
        don&apos;t own is a policy violation and puts your pool at risk.
      </DocP>

      <DocH2 id="ai-details">What AI does MOZOflix use, and where?</DocH2>
      <DocP>
        We use Anthropic&apos;s Claude Haiku for two things: the Upload
        Assistant (generates title/description/tags from your filename)
        and the moderation classifier (rejects nudity, gore, violence,
        drugs, hate symbols at upload). Inference runs server-side; the
        video file itself is never sent to Anthropic — only extracted
        image frames.
      </DocP>

      <DocH2 id="reward-optimizer-ai">
        Is the Reward Optimizer AI?
      </DocH2>
      <DocP>
        Not in the LLM sense. It&apos;s a heuristic that looks at the
        network-wide median reward-per-view, your chosen category, and
        current pool sizes, and suggests a rate. Every input is visible
        in the widget so you can override it.
      </DocP>

      <DocH2 id="mainnet">When mainnet?</DocH2>
      <DocP>
        After a contract audit and a controlled beta of creator invites.
        We&apos;re actively pursuing an ecosystem grant that funds both.
      </DocP>
    </DocPage>
  );
}
