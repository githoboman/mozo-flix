import Link from "next/link";
import Image from "next/image";
import { watchUrl } from "@/lib/format";

export function VideoCard({
  id,
  title,
  creator,
  views,
  reward,
  duration,
  thumb,
  avatar,
  category,
}: {
  id: string;
  title: string;
  /** Real profile name, if known. Omit when only the wallet address is available. */
  creator?: string;
  views: string;
  reward: string;
  duration: string;
  thumb?: string;
  avatar?: string;
  category?: string;
}) {
  // Deterministic gradient fallback for on-chain videos that don't yet have
  // a real thumbnail (placeholder content hash, IPFS not pinned, etc.).
  const seed = (title + id).length;
  const gradientThumb = `linear-gradient(135deg, hsl(${(seed * 37) % 360},45%,18%), hsl(${(seed * 67) % 360},55%,8%))`;
  const gradientAvatar = `linear-gradient(135deg, hsl(${(seed * 23) % 360},70%,55%), hsl(${(seed * 89) % 360},80%,40%))`;

  return (
    <Link
      href={watchUrl(id, title)}
      className="card-reveal group block overflow-hidden rounded-lg border border-accent-border bg-card-2 shadow-md transition-colors hover:border-accent/40"
    >
        <div className="relative aspect-video overflow-hidden">
          {thumb ? (
            <Image
              src={thumb}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div
              className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
              style={{ background: gradientThumb }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
          <div className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-ui text-[9px] font-semibold tracking-[0.12em] text-black shadow-[0_0_10px_rgba(255,107,0,0.45)]">
            {reward}
          </div>
          {duration !== "—" && (
            <div className="absolute bottom-2 right-2">
              <span className="rounded border border-white/10 bg-black/70 px-1.5 py-0.5 font-ui text-[9px] text-white backdrop-blur-sm">
                {duration}
              </span>
            </div>
          )}
        </div>
        <div className="relative z-10 px-3 py-2.5">
          <h3 className="mb-1.5 line-clamp-2 font-ui text-[13px] font-semibold leading-snug text-white transition-colors group-hover:text-accent">
            {title}
          </h3>
          {creator ? (
            <div className="flex items-center gap-2">
              <div
                className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/10 bg-card"
                style={!avatar ? { background: gradientAvatar } : undefined}
              >
                {avatar && (
                  <Image
                    src={avatar}
                    alt={creator}
                    fill
                    sizes="24px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-ui text-[10px] tracking-[0.08em] text-white/70">
                  {creator}
                </p>
                <p className="truncate text-[10px] font-light text-muted">
                  {views}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] font-light text-muted">
              {category && (
                <span className="rounded bg-white/5 px-1.5 py-0.5 font-ui uppercase tracking-[0.08em] text-white/70">
                  {category}
                </span>
              )}
              <span className="truncate">{views}</span>
            </div>
          )}
      </div>
    </Link>
  );
}
