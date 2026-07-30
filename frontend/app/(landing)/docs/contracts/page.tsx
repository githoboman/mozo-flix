import {
  DocPage,
  DocH2,
  DocP,
  DocLink,
  DocList,
  DocCode,
  DocCallout,
} from "@/components/docs/Prose";

export const metadata = {
  title: "Contracts & security — MOZOflix Docs",
  description:
    "The Clarity contract suite behind MOZOflix, deployed on Stacks testnet. Addresses, source, and security model.",
};

const DEPLOYER = "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E";
const CONTRACTS = [
  {
    name: "mozoflix-videos",
    role: "Video registry — id, creator, content hash, thresholds, active flag",
  },
  {
    name: "mozoflix-rewards-v2",
    role: "Escrow + distribution — register-and-fund, distribute-reward, withdraw-pool",
  },
  {
    name: "mozoflix-creators",
    role: "Optional creator profiles — display name, bio, verified flag",
  },
  {
    name: "mozoflix-referrals",
    role: "Referral graph — attribution + bonus claims",
  },
  {
    name: "mozoflix-admin",
    role: "Global config — owner, fee bps, fee recipient, paused",
  },
];

export default function ContractsDoc() {
  return (
    <DocPage
      eyebrow="Reference"
      title="Contracts & security"
      intro="Five Clarity contracts, deployed and tested on Stacks testnet. Everything a viewer earns and everything a creator pays flows through code you can audit."
    >
      <DocH2 id="deployed">Deployed contracts</DocH2>
      <DocP>
        All five live under the same deployer principal:
      </DocP>
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4">
        <code className="font-mono text-[13px] text-accent break-all">
          {DEPLOYER}
        </code>
      </div>
      <DocList>
        {CONTRACTS.map((c) => (
          <li key={c.name}>
            <DocLink
              external
              href={`https://explorer.hiro.so/txid/${DEPLOYER}.${c.name}?chain=testnet`}
            >
              <code>{c.name}</code>
            </DocLink>{" "}
            — {c.role}
          </li>
        ))}
      </DocList>

      <DocH2 id="security-model">Security model</DocH2>
      <DocList>
        <li>
          <strong className="text-white">Written in Clarity.</strong>{" "}
          Decidable, non-Turing-complete, no re-entrancy — the class of
          bugs that drained Ethereum vaults doesn&apos;t exist here.
        </li>
        <li>
          <strong className="text-white">Server signer holds only
          distribute-reward authority.</strong> Its wallet can call{" "}
          <DocCode>distribute-reward</DocCode> from the pre-funded pool but
          cannot withdraw pools, change fees, or edit videos.
        </li>
        <li>
          <strong className="text-white">Rate limited.</strong>{" "}
          Per-IP and per-wallet token buckets sit in front of the signer
          so a botnet can&apos;t drain a pool via spam.
        </li>
        <li>
          <strong className="text-white">Withdraw is creator-only.</strong>{" "}
          Pool funds always land in the creator&apos;s registered wallet
          — enforced by <DocCode>asserts! (is-eq tx-sender creator)</DocCode>
          .
        </li>
        <li>
          <strong className="text-white">One claim per wallet forever.</strong>{" "}
          A <DocCode>has-claimed</DocCode> map records each viewer&apos;s
          first claim per video; reruns are rejected on-chain, not by the
          UI.
        </li>
      </DocList>

      <DocH2 id="testing">Testing</DocH2>
      <DocP>
        86+ Clarinet tests cover happy paths and adversarial cases —
        double-claim, deactivated video, empty pool, fee math, ownership
        transfer, admin pause. Source is in the{" "}
        <DocLink external href="https://github.com/githoboman/mozo-flix">
          repo
        </DocLink>
        .
      </DocP>

      <DocCallout kind="warning">
        Contracts are unaudited pre-mainnet. Testnet STX has no monetary
        value. Do not send mainnet STX to the testnet deployer address.
      </DocCallout>

      <DocH2 id="verify">Verify a payout yourself</DocH2>
      <DocList ordered>
        <li>Watch a video past the completion gate.</li>
        <li>Click the &ldquo;View tx&rdquo; link in the reward toast.</li>
        <li>
          Confirm on the explorer that the tx calls{" "}
          <DocCode>distribute-reward</DocCode> on{" "}
          <code>mozoflix-rewards-v2</code>, and that a STX transfer to
          your address is in the events.
        </li>
      </DocList>
    </DocPage>
  );
}
