import {
  DocPage,
  DocH2,
  DocP,
  DocLink,
  DocList,
  DocCallout,
} from "@/components/docs/Prose";

export const metadata = {
  title: "For viewers — MOZOflix Docs",
  description:
    "How to earn STX by watching videos on MOZOflix. Wallet setup, watching mechanics, and how rewards land in your wallet.",
};

export default function ViewersDoc() {
  return (
    <DocPage
      eyebrow="Guides"
      title="For viewers"
      intro="You watch a video to the completion threshold; a smart contract pays you STX from the creator's pool. Under a minute of setup, then it just works."
    >
      <DocH2 id="setup">Setup, one time</DocH2>
      <DocList ordered>
        <li>
          Install{" "}
          <DocLink external href="https://leather.io/install-extension">
            Leather
          </DocLink>{" "}
          or{" "}
          <DocLink external href="https://www.xverse.app/download">
            Xverse
          </DocLink>{" "}
          — both are free Stacks wallets. On desktop, get the browser
          extension. On mobile, install the app.
        </li>
        <li>
          Create a wallet or import an existing one. Copy your address
          (starts with <code>ST</code> for testnet, <code>SP</code> for
          mainnet).
        </li>
        <li>
          Grab some testnet STX from the{" "}
          <DocLink external href="https://explorer.hiro.so/sandbox/faucet?chain=testnet">
            Hiro faucet
          </DocLink>
          . You don&apos;t need STX to <em>earn</em>, but you need it if
          you also plan to publish.
        </li>
        <li>
          Open <DocLink href="/browse">/browse</DocLink> and click
          &ldquo;Connect Wallet&rdquo;.
        </li>
      </DocList>

      <DocH2 id="watching">Watching to earn</DocH2>
      <DocList>
        <li>
          Pick a video. The pill at the top-right of each card shows the
          reward (e.g. <code>+1 STX</code>).
        </li>
        <li>
          Press play. The orange bar under the player is your{" "}
          <em>verified watch time</em> — not the scrub position. Skipping
          ahead won&apos;t fill it.
        </li>
        <li>
          When the bar crosses the gate marker (the vertical line at 70%
          by default), we call the reward contract and STX lands in your
          wallet within a couple of blocks.
        </li>
      </DocList>

      <DocCallout>
        You&apos;ll get a toast with a &ldquo;View tx&rdquo; link the
        moment the payout is broadcast. That link points at the Hiro
        explorer so you can verify it independently.
      </DocCallout>

      <DocH2 id="one-per-wallet">One claim per wallet, per video</DocH2>
      <DocP>
        The Clarity contract records each viewer&apos;s claim. Reloading,
        opening a new tab, or clearing browser storage won&apos;t let you
        earn twice from the same video. This isn&apos;t a bug — it&apos;s
        what protects the creator&apos;s pool from being drained by a
        single viewer.
      </DocP>

      <DocH2 id="pool-empty">What if the pool is empty?</DocH2>
      <DocP>
        You can still watch — the video plays exactly the same — but the
        reward call will fail with &ldquo;pool empty&rdquo;. The pool
        badge on the watch page shows the current balance so you know
        before you invest the time.
      </DocP>

      <DocH2 id="troubleshooting">Troubleshooting</DocH2>
      <DocList>
        <li>
          <strong className="text-white">
            &ldquo;Reward unavailable&rdquo; toast?
          </strong>{" "}
          Usually one of: pool empty, video deactivated by the creator, or
          you&apos;ve already claimed. The message will say which.
        </li>
        <li>
          <strong className="text-white">Wallet won&apos;t connect on mobile?</strong>{" "}
          Wallet extensions only work in desktop browsers. On mobile, open
          MOZOflix inside the Xverse or Leather app&apos;s built-in
          browser — the &ldquo;Open in Xverse&rdquo; button in the connect
          modal will do this for you.
        </li>
        <li>
          <strong className="text-white">
            Video loads but doesn&apos;t play?
          </strong>{" "}
          The IPFS gateway may be rate-limiting. Hit refresh — the player
          will automatically try alternate gateways.
        </li>
      </DocList>
    </DocPage>
  );
}
