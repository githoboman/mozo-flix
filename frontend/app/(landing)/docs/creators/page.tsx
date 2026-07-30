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
  title: "For creators — MOZOflix Docs",
  description:
    "How to publish a video, fund a reward pool, and manage campaigns on MOZOflix.",
};

export default function CreatorsDoc() {
  return (
    <DocPage
      eyebrow="Guides"
      title="For creators"
      intro="You bring the video, we handle pinning, on-chain registration, and reward distribution. You keep every dollar an advertiser would have taken — because there's no advertiser."
    >
      <DocH2 id="publishing">Publishing a video</DocH2>
      <DocList ordered>
        <li>
          Head to <DocLink href="/upload">/upload</DocLink> and pick a
          source: <strong className="text-white">File</strong> (native
          upload, pinned to IPFS),{" "}
          <strong className="text-white">YouTube</strong> (paste any YT
          URL), or <strong className="text-white">X</strong> (paste any
          post URL with a video).
        </li>
        <li>
          For files: the AI Upload Assistant auto-fills title, description,
          category and tags from the filename. Edit whatever you like
          before publishing.
        </li>
        <li>
          Pick or upload a thumbnail. Files get an auto-extracted preview
          from a frame at ~2s; YouTube uses the platform&apos;s default;
          you can always upload a custom 16:9 image.
        </li>
        <li>
          Set your <strong className="text-white">reward per view</strong>{" "}
          and <strong className="text-white">initial pool</strong>. The AI
          Reward Optimizer suggests a rate based on the network median for
          your category.
        </li>
        <li>
          Click Publish. You&apos;ll sign one transaction —{" "}
          <DocCode>register-and-fund</DocCode> — that both registers the
          video on-chain and locks the pool STX into escrow atomically.
        </li>
      </DocList>

      <DocCallout>
        Registration and funding are one on-chain transaction. Either both
        happen or neither does — you can never end up with a registered
        video and no pool.
      </DocCallout>

      <DocH2 id="pool-math">Pool math</DocH2>
      <DocList>
        <li>
          You fund the pool with X STX. Platform takes a 5% fee at fund
          time.
        </li>
        <li>
          Each verified view pays out at your set{" "}
          <DocCode>reward-per-view</DocCode> rate. So a 100&nbsp;STX pool
          at 1&nbsp;STX/view = ~95 verified views after the fee.
        </li>
        <li>
          When the pool hits zero, distribution stops. Your video keeps
          playing; viewers just don&apos;t earn from it. Top up any time
          with the <strong className="text-white">Fund</strong> button in
          Studio.
        </li>
        <li>
          You can withdraw the unspent pool balance at any time with the{" "}
          <strong className="text-white">Withdraw</strong> button.
        </li>
      </DocList>

      <DocH2 id="deactivating">Deactivating a campaign</DocH2>
      <DocP>
        Deactivating a video with the <strong className="text-white">
          Deactivate
        </strong>{" "}
        button in Studio hides it from the feed and stops future rewards.
        If your pool still has funds, you&apos;ll be prompted to also sign
        a second tx that returns them to your wallet.
      </DocP>

      <DocH2 id="ai-assistants">The AI assistants</DocH2>
      <DocH3 id="upload-assistant">Upload Assistant</DocH3>
      <DocP>
        Fires automatically when you pick a video file. Reads the filename
        + duration + your optional brief and returns a punchy title,
        1-3-sentence description, category, and search tags. Powered by
        Claude Haiku — inference runs server-side; the file itself never
        leaves your browser at this step.
      </DocP>
      <DocH3 id="reward-optimizer">Reward Optimizer</DocH3>
      <DocP>
        Looks at the network-wide median reward for your category, the
        current spread of pool sizes, and suggests a per-view rate that
        clears the median without overspending. Purely heuristic — no
        black-box model, no external API — and every input is visible in
        the widget.
      </DocP>
    </DocPage>
  );
}
