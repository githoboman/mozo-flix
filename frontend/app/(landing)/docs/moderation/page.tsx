import {
  DocPage,
  DocH2,
  DocP,
  DocList,
  DocCallout,
} from "@/components/docs/Prose";

export const metadata = {
  title: "Content policy — MOZOflix Docs",
  description:
    "What's allowed on MOZOflix, how moderation works, and how to report a video.",
};

export default function ModerationDoc() {
  return (
    <DocPage
      eyebrow="Reference"
      title="Content policy"
      intro="MOZOflix pays real STX for attention. That makes clear content standards non-negotiable — for creators, viewers, and the reward pools' integrity."
    >
      <DocH2 id="what-is-not-allowed">What is not allowed</DocH2>
      <DocList>
        <li>
          Any depiction of sexual content or nudity, including
          suggestively-framed content. Adult content is banned outright,
          no age gate.
        </li>
        <li>
          Graphic gore, dismemberment, or death shown for shock value.
        </li>
        <li>
          Real-world violence — assault, weapons pointed at people, blood
          in a non-fictional context.
        </li>
        <li>
          Promotion or instructional depiction of hard drugs.
        </li>
        <li>
          Symbols of organized hate groups (swastikas, KKK regalia, etc.)
          displayed positively or unironically.
        </li>
        <li>Content that infringes on third-party copyright.</li>
        <li>Harassment, doxxing, or targeted abuse of a private person.</li>
      </DocList>

      <DocCallout>
        Fictional/dramatic content in film clips, mainstream gameplay
        footage, news reporting, medical education, and standard fitness
        or dance content are <strong className="text-white">allowed</strong>
        . The tests below are &ldquo;is this real and shown for shock&rdquo;
        rather than &ldquo;is this on screen at all&rdquo;.
      </DocCallout>

      <DocH2 id="two-layers">How moderation is enforced</DocH2>
      <DocP>
        Two layers, applied in this order:
      </DocP>
      <DocList ordered>
        <li>
          <strong className="text-white">AI at upload.</strong> Every
          file upload has 5 frames extracted client-side and classified by
          Claude Haiku vision. If any category (nudity, gore, violence,
          drugs, hate symbols) crosses its threshold, the upload is
          rejected before anything is pinned to IPFS or broadcast
          on-chain. No STX is locked up; the creator sees exactly which
          category tripped.
        </li>
        <li>
          <strong className="text-white">Community reports + admin
          takedown.</strong> Every watch page has a Report button. Three
          unique wallet reports auto-hide the video pending review. Admin
          can hide, on-chain deactivate, or slash the pool.
        </li>
      </DocList>

      <DocH2 id="reporting">Reporting a video</DocH2>
      <DocList ordered>
        <li>Open the video on <code>/watch/[id]</code>.</li>
        <li>
          Click the <strong className="text-white">Report</strong> button
          in the engagement bar under the player.
        </li>
        <li>Pick a category and add optional context.</li>
        <li>
          Your wallet address is recorded so the same wallet can&apos;t
          spam-report to auto-hide a competitor.
        </li>
      </DocList>

      <DocH2 id="appeal">Appeal a takedown</DocH2>
      <DocP>
        If your upload was rejected at the AI layer or your video was
        hidden by an admin and you believe it&apos;s in-policy, contact
        support with the video id (or the manifest CID for rejected
        uploads). We publish moderation actions to a public log so every
        takedown is inspectable.
      </DocP>

      <DocH2 id="the-web3-reality">The Web3 reality</DocH2>
      <DocP>
        A file pinned to IPFS lives on IPFS. MOZOflix can refuse to
        surface it and refuse to pay STX for it — that&apos;s what our
        moderation tools do. What we can&apos;t do is retroactively delete
        the CID from every gateway everywhere. This is an honest trade-off
        of decentralized hosting.
      </DocP>
    </DocPage>
  );
}
