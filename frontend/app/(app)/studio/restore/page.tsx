import { RestoreUploadsPanel } from "@/components/RestoreUploadsPanel";
import Link from "next/link";

export const metadata = {
  title: "Restore uploads — MOZOflix Studio",
  description:
    "Recover videos that were on-chain before a Stacks testnet reset. Reads your local upload history and re-registers each video on the fresh contract.",
};

export default function RestorePage() {
  return (
    <main className="mx-auto max-w-[880px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[100px]">
      <div className="mb-2 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
        <Link
          href="/studio"
          className="hover:text-accent-bright"
        >
          ← Studio
        </Link>
      </div>
      <h1 className="mb-3 font-display text-[clamp(36px,5vw,56px)] leading-[1.05] tracking-[0.01em]">
        Restore uploads
      </h1>
      <p className="mb-8 max-w-[62ch] text-[15px] font-light leading-[1.7] text-muted">
        Stacks testnet was reset on 2026-08-13 and every on-chain video
        record vanished with it. The video files themselves (still pinned
        to IPFS) survived. This page reads your browser&apos;s local
        upload history and re-registers each video on the fresh contract
        so they show up on <span className="text-accent">/browse</span>{" "}
        again. New numeric ids will be assigned — old{" "}
        <span className="font-mono">/watch/N</span> links won&apos;t carry
        over.
      </p>

      <RestoreUploadsPanel />

      <div className="mt-10 rounded-xl border border-white/5 bg-surface p-5 text-[12px] font-light text-muted">
        <div className="mb-2 font-ui text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
          Notes
        </div>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            Only uploads from <span className="text-white">this browser</span>{" "}
            and <span className="text-white">this wallet</span> appear —
            localStorage doesn&apos;t travel. Testers on their own devices
            need to run this from their own browsers.
          </li>
          <li>
            YouTube / X uploads without a locally-cached manifest CID
            can&apos;t be restored automatically. Re-add them from{" "}
            <Link href="/upload" className="text-accent hover:underline">
              /upload
            </Link>
            .
          </li>
          <li>
            Each restore is one wallet-signed tx that funds a small pool
            with the STX amount you choose. You can top the pools up later
            from{" "}
            <Link href="/studio" className="text-accent hover:underline">
              /studio
            </Link>
            .
          </li>
        </ul>
      </div>
    </main>
  );
}
