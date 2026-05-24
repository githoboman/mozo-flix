"use client";

import { useState } from "react";
import { useWallet } from "@/lib/useWallet";
import { registerAndFund, stxToMicro } from "@/lib/stacks";
import { getNextVideoId } from "@/lib/stacks-reads";
import { setVideoMeta } from "@/lib/videoMeta";
import { uploadToIPFS } from "@/lib/ipfs";
import { RewardSuggestionWidget } from "@/components/RewardSuggestion";
import { AIUploadAssistant } from "@/components/AIUploadAssistant";
import { TxChip } from "@/components/Chips";
import { formatStx } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/Button";
import { friendlyError } from "@/lib/errorMessage";
import { pinManifest } from "@/lib/manifest";
import {
  parseYouTubeUrl,
  parseXUrl,
  buildYouTubeSource,
  buildXSource,
  ytEmbedUrl,
} from "@/lib/videoSource";

export default function UploadPage() {
  const wallet = useWallet();
  const toast = useToast();
  const [sourceType, setSourceType] = useState<"file" | "youtube" | "x">(
    "file",
  );
  const [file, setFile] = useState<File | null>(null);
  const [ytUrl, setYtUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [reward, setReward] = useState(1);
  const [pool, setPool] = useState(50);
  const [threshold, setThreshold] = useState(70);
  const [category, setCategory] = useState("Education");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "uploading"; pct?: number }
    | { kind: "pinning-manifest"; videoCid: string }
    | { kind: "registering"; manifestCid: string }
    | {
        kind: "done";
        registerTx: string;
        manifestCid: string;
        videoCid: string;
        videoId: number;
      }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const submit = async () => {
    if (!wallet.connected || !wallet.address) {
      setStatus({ kind: "error", message: "Connect your wallet first." });
      return;
    }
    if (!title.trim()) {
      setStatus({ kind: "error", message: "Title is required." });
      return;
    }

    // Validate source per type
    let resolvedVideoCid: string | undefined;
    let manifestSource:
      | ReturnType<typeof buildYouTubeSource>
      | ReturnType<typeof buildXSource>
      | { type: "ipfs"; videoCid: string; videoFormat: "mp4" }
      | null = null;

    try {
      if (sourceType === "file") {
        if (!file) {
          setStatus({ kind: "error", message: "Pick a video file first." });
          return;
        }
        setStatus({ kind: "uploading" });
        const { cid } = await uploadToIPFS(file);
        resolvedVideoCid = cid;
        manifestSource = {
          type: "ipfs",
          videoCid: cid,
          videoFormat: "mp4",
        };
      } else if (sourceType === "youtube") {
        const parsed = parseYouTubeUrl(ytUrl);
        if (!parsed) {
          setStatus({
            kind: "error",
            message: "Paste a valid YouTube link or 11-char video ID.",
          });
          return;
        }
        manifestSource = buildYouTubeSource(parsed.id, parsed.url);
      } else {
        const parsed = parseXUrl(xUrl);
        if (!parsed) {
          setStatus({
            kind: "error",
            message: "Paste a valid X/Twitter post link.",
          });
          return;
        }
        manifestSource = buildXSource(parsed.id, parsed.url);
      }

      // Pin the manifest. v2 schema with source descriptor — works for all types.
      setStatus({
        kind: "pinning-manifest",
        videoCid: resolvedVideoCid ?? "",
      });
      const expectedId = await getNextVideoId();
      const { cid: manifestCid } = await pinManifest({
        schema: "mozoflix-video-v2",
        title: title.trim(),
        description: desc.trim(),
        category,
        source: manifestSource!,
        uploaderAddress: wallet.address,
        uploadedAt: Date.now(),
      });

      // Submit register-and-fund with the MANIFEST CID on chain.
      setStatus({ kind: "registering", manifestCid });
      await registerAndFund(
        `ipfs://${manifestCid}`,
        stxToMicro(reward),
        threshold,
        stxToMicro(pool),
        wallet.address,
        async (registerTx) => {
          setVideoMeta({
            id: expectedId,
            title: title.trim(),
            description: desc.trim(),
            category,
            videoCid: resolvedVideoCid,
            videoFormat: sourceType === "file" ? "mp4" : undefined,
            uploadedAt: Date.now(),
            uploaderAddress: wallet.address!,
          });
          setStatus({
            kind: "done",
            registerTx,
            manifestCid,
            videoCid: resolvedVideoCid ?? "",
            videoId: expectedId,
          });
          toast.show({
            kind: "success",
            title: "Video published",
            body: `#${expectedId} · ${title.trim()} · pool funded with ${pool} STX`,
            action: {
              label: "Open video",
              href: `/watch/${expectedId}`,
            },
          });
        },
      );
    } catch (e) {
      const msg = friendlyError(e, "Upload");
      setStatus({ kind: "error", message: msg });
      toast.show({ kind: "error", title: "Upload failed", body: msg });
    }
  };

  return (
    <>
      <main className="mx-auto max-w-[1100px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[100px]">
        <div className="mb-2 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-8 bg-accent" />
          New Campaign
        </div>
        <h1 className="mb-10 font-display text-[clamp(48px,5vw,80px)] uppercase leading-[0.95]">
          Upload <span className="text-accent">Video</span>
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Upload + thumbnail */}
          <div className="space-y-6 lg:col-span-2">
            {/* Source type tabs */}
            <div className="flex gap-1 rounded-lg border border-white/10 bg-card p-1">
              {(
                [
                  { id: "file", label: "Upload file", icon: "cloud_upload" },
                  { id: "youtube", label: "From YouTube", icon: "smart_display" },
                  { id: "x", label: "From X", icon: "share" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSourceType(opt.id)}
                  className={`press-feedback flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 font-ui text-[11px] font-bold uppercase tracking-[0.08em] transition ${
                    sourceType === opt.id
                      ? "bg-accent text-black"
                      : "text-muted hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {opt.icon}
                  </span>
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              ))}
            </div>

            {sourceType === "youtube" && (
              <YouTubePicker
                url={ytUrl}
                onChange={setYtUrl}
                onTitleSuggested={(t) => !title && setTitle(t)}
              />
            )}

            {sourceType === "x" && (
              <XPicker url={xUrl} onChange={setXUrl} />
            )}

            {sourceType === "file" && (file ? (
              <div className="overflow-hidden rounded-xl border border-accent/40 bg-card">
                <video
                  src={URL.createObjectURL(file)}
                  controls
                  className="aspect-video w-full bg-black object-contain"
                />
                <div className="flex items-center justify-between gap-3 border-t border-white/5 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-ui text-[13px] font-semibold text-white">
                      {file.name}
                    </div>
                    <div className="font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                  <label
                    htmlFor="upload"
                    className="cursor-pointer rounded border border-white/10 px-3 py-1.5 font-ui text-[10px] uppercase tracking-[0.1em] text-muted transition hover:border-accent hover:text-accent"
                  >
                    Replace
                  </label>
                  <input
                    id="upload"
                    type="file"
                    accept="video/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </div>
              </div>
            ) : (
              <label
                htmlFor="upload"
                className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-white/15 bg-card transition hover:border-accent hover:bg-card-2"
              >
                <input
                  id="upload"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                <span className="material-symbols-outlined text-5xl text-accent">
                  cloud_upload
                </span>
                <div className="text-center">
                  <div className="font-ui text-[14px] font-bold uppercase tracking-[0.1em]">
                    Drop video file or click to browse
                  </div>
                  <div className="mt-1 text-[12px] font-light text-muted">
                    MP4, MOV up to 5GB · plays directly from IPFS
                  </div>
                </div>
              </label>
            ))}

            {sourceType === "file" && (
              <AIUploadAssistant
                file={file}
                creatorHandle={wallet.address ?? undefined}
                onApply={(s) => {
                  setTitle(s.title);
                  setDesc(s.description);
                  setCategory(s.category);
                }}
              />
            )}

            <Field
              label="Title"
              hint={`${title.length}/60`}
              error={
                title.length > 0 && title.length < 4
                  ? "Title is a bit short — aim for at least 4 characters"
                  : title.length > 60
                  ? "Title too long — keep it under 60 characters"
                  : undefined
              }
            >
              <input
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your video a punchy title..."
                className={`w-full rounded border bg-surface px-4 py-3 text-[14px] focus:outline-none ${
                  title.length > 60
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-white/10 focus:border-accent"
                }`}
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={5}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Tell viewers what they'll learn or experience..."
                className="w-full resize-none rounded border border-white/10 bg-surface p-3 text-[13px] focus:border-accent focus:outline-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-white/10 bg-surface px-4 py-3 text-[14px] focus:border-accent focus:outline-none"
                >
                  {["Education", "Gaming", "DeFi", "NFTs", "News"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field label="Visibility">
                <select className="w-full rounded border border-white/10 bg-surface px-4 py-3 text-[14px] focus:border-accent focus:outline-none">
                  <option>Public</option>
                  <option>Unlisted</option>
                  <option>Pay-to-Unlock</option>
                  <option>Subscribers Only</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Reward pool sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-accent/30 bg-card p-6">
              <div className="mb-1 font-ui text-[10px] uppercase tracking-[0.15em] text-accent">
                Reward Pool
              </div>
              <h3 className="mb-5 font-display text-h2">Watch-to-Earn</h3>

              <div className="mb-5">
                <RewardSuggestionWidget
                  category={category}
                  onApplyReward={setReward}
                  onApplyPool={setPool}
                />
              </div>

              <Field label="Reward per view (STX)">
                <input
                  type="number"
                  step={0.1}
                  value={reward}
                  onChange={(e) => setReward(Number(e.target.value))}
                  className="w-full rounded border border-white/10 bg-surface px-4 py-3 font-display text-2xl text-white focus:border-accent focus:outline-none"
                />
              </Field>

              <Field label="Initial pool funding (STX)">
                <input
                  type="number"
                  value={pool}
                  onChange={(e) => setPool(Number(e.target.value))}
                  className="w-full rounded border border-white/10 bg-surface px-4 py-3 font-display text-2xl text-white focus:border-accent focus:outline-none"
                />
                <div className="mt-1 text-[11px] text-muted">
                  Funds {Math.floor(pool / reward)} verified views
                </div>
              </Field>

              <Field label={`Min completion: ${threshold}%`}>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </Field>

              <div className="mt-4 rounded border border-white/5 bg-surface p-4 text-[11px]">
                <div className="mb-1 flex justify-between text-muted">
                  <span>Pool</span>
                  <span className="font-ui text-white">{pool} STX</span>
                </div>
                <div className="mb-1 flex justify-between text-muted">
                  <span>Platform fee (5%)</span>
                  <span className="font-ui">{(pool * 0.05).toFixed(2)} STX</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-white/5 pt-2">
                  <span className="font-ui text-[10px] uppercase tracking-[0.1em] text-muted">
                    Net to pool
                  </span>
                  <span className="font-display text-base text-accent">
                    {(pool * 0.95).toFixed(2)} STX
                  </span>
                </div>
              </div>
            </div>

            {status.kind === "error" && (
              <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-300">
                {status.message}
              </div>
            )}
            {status.kind === "uploading" && (
              <div className="rounded border border-accent/40 bg-accent-dim p-3 text-[12px] text-accent">
                📤 Uploading video to IPFS…
              </div>
            )}
            {status.kind === "pinning-manifest" && (
              <div className="rounded border border-accent/40 bg-accent-dim p-3 text-[12px] text-accent">
                📝 Pinning metadata manifest…
              </div>
            )}
            {status.kind === "registering" && (
              <div className="rounded border border-accent/40 bg-accent-dim p-3 text-[12px] text-accent">
                ✍️ Confirm in your wallet to publish on-chain.
              </div>
            )}
            {status.kind === "done" && (
              <div className="rounded border border-green-500/40 bg-green-500/10 p-4 text-[13px] text-green-200">
                <div className="font-display text-h2 text-green-300">
                  ✓ &ldquo;{title}&rdquo; is live
                </div>
                <p className="mt-1 text-[12px] font-light text-green-200/80">
                  Pool funded with {pool} STX. Your video will appear on
                  the browse feed once the tx confirms (~10 min).
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href={`/watch/${status.videoId}`}
                    className="rounded bg-accent px-4 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.1em] text-black hover:bg-accent-bright"
                  >
                    Open Video →
                  </a>
                  <TxChip tx={status.registerTx} label="tx" />
                </div>
              </div>
            )}
            <div className="sticky bottom-4 z-10 -mx-1 backdrop-blur-md">
              <Button
                onClick={submit}
                fullWidth
                size="lg"
                loading={
                  status.kind === "uploading" ||
                  status.kind === "pinning-manifest" ||
                  status.kind === "registering"
                }
                disabled={
                  !wallet.connected ||
                  !title.trim() ||
                  (sourceType === "file" && !file) ||
                  (sourceType === "youtube" && !parseYouTubeUrl(ytUrl)) ||
                  (sourceType === "x" && !parseXUrl(xUrl)) ||
                  status.kind === "done"
                }
                trailingIcon={
                  status.kind === "done"
                    ? "check_circle"
                    : !wallet.connected
                    ? undefined
                    : "arrow_forward"
                }
              >
                {status.kind === "uploading"
                  ? "Uploading to IPFS…"
                  : status.kind === "pinning-manifest"
                  ? "Pinning manifest…"
                  : status.kind === "registering"
                  ? "Confirm in wallet…"
                  : status.kind === "done"
                  ? "Published"
                  : !wallet.connected
                  ? "Connect wallet to publish"
                  : sourceType === "file" && !file
                  ? "Pick a video file"
                  : sourceType === "youtube" && !parseYouTubeUrl(ytUrl)
                  ? "Paste a YouTube link"
                  : sourceType === "x" && !parseXUrl(xUrl)
                  ? "Paste an X post link"
                  : !title.trim()
                  ? "Add a title"
                  : `Publish + Fund ${pool} STX`}
              </Button>
            </div>
            <button className="w-full rounded border border-white/10 py-3 font-ui text-[11px] uppercase tracking-[0.1em] text-muted hover:border-white/30 hover:text-white">
              Save as draft
            </button>
          </aside>
        </div>
      </main>
    </>
  );
}

function YouTubePicker({
  url,
  onChange,
}: {
  url: string;
  onChange: (v: string) => void;
  onTitleSuggested?: (t: string) => void;
}) {
  const parsed = parseYouTubeUrl(url);
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-2 block font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
          YouTube link
        </span>
        <input
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className={`w-full rounded border bg-surface px-4 py-3 text-[14px] focus:outline-none ${
            url && !parsed
              ? "border-red-500/50 focus:border-red-500"
              : "border-white/10 focus:border-accent"
          }`}
        />
        {url && !parsed && (
          <div className="mt-1.5 text-[11px] text-red-300">
            That doesn&apos;t look like a YouTube link. Try the share URL.
          </div>
        )}
      </label>
      {parsed && (
        <div className="overflow-hidden rounded-xl border border-accent/40 bg-card">
          <div className="relative aspect-video w-full">
            <iframe
              src={ytEmbedUrl(parsed.id)}
              title="YouTube preview"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
          <div className="border-t border-white/5 px-5 py-3 font-mono text-[11px] text-muted">
            youtube · {parsed.id}
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted/80">
        Reward fires when viewers cross 70% of the YouTube video — tracked
        via the official iframe player API. Viewers stay on MOZOflix; nothing
        leaves your funnel.
      </p>
    </div>
  );
}

function XPicker({
  url,
  onChange,
}: {
  url: string;
  onChange: (v: string) => void;
}) {
  const parsed = parseXUrl(url);
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-2 block font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
          X / Twitter post link
        </span>
        <input
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://x.com/handle/status/…"
          className={`w-full rounded border bg-surface px-4 py-3 text-[14px] focus:outline-none ${
            url && !parsed
              ? "border-red-500/50 focus:border-red-500"
              : "border-white/10 focus:border-accent"
          }`}
        />
        {url && !parsed && (
          <div className="mt-1.5 text-[11px] text-red-300">
            Paste the link to a specific X post (must contain /status/).
          </div>
        )}
      </label>
      {parsed && (
        <div className="rounded-xl border border-white/10 bg-surface p-4">
          <div className="mb-1 font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
            Preview
          </div>
          <div className="font-mono text-[12px] text-white">
            x · post {parsed.id}
          </div>
          <a
            href={parsed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-ui text-[11px] uppercase tracking-[0.1em] text-accent hover:underline"
          >
            Open on X ↗
          </a>
        </div>
      )}
      <p className="text-[11px] text-muted/80">
        X doesn&apos;t expose playback events. The reward fires after a
        viewer keeps the embed in focus for 30 seconds — switch tabs and
        the timer pauses.
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
          {label}
        </span>
        {hint && (
          <span className="font-ui text-[10px] tracking-[0.1em] text-muted/70">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-red-300">
          <span className="material-symbols-outlined text-[12px]">error</span>
          {error}
        </div>
      )}
    </div>
  );
}
