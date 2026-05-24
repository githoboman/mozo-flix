"use client";

import { useEffect, useState } from "react";
import {
  fetchManifest,
  extractCid,
  getSource,
  type VideoSource,
} from "./manifest";
import { getVideoMeta } from "./videoMeta";
import { ipfsToUrl } from "./ipfs";
import type { VideoMeta } from "./stacks-reads";

export type ResolvedListItem = {
  video: VideoMeta;
  title: string;
  description: string;
  category?: string;
  videoCid: string | null;
  source: VideoSource | null;
  thumbnail: string | null;
  /**
   * True only after the IPFS manifest was successfully fetched.
   * Use this to filter out legacy entries that never got proper metadata.
   */
  manifestResolved: boolean;
};

/** Derive a thumbnail URL from the manifest + source. Returns null if none. */
function deriveThumb(
  source: VideoSource | null,
  thumb: string | undefined,
): string | null {
  if (thumb) {
    // Local meta may store a data: URL; manifests store an IPFS CID
    if (thumb.startsWith("data:") || thumb.startsWith("http")) return thumb;
    return ipfsToUrl(thumb);
  }
  if (source?.type === "youtube") {
    // hqdefault is 480x360 — well-sized for a card and always exists
    return `https://i.ytimg.com/vi/${source.youtubeId}/hqdefault.jpg`;
  }
  return null;
}

/**
 * Resolve display data for a list of on-chain videos in parallel.
 * - Reads localStorage immediately for the uploader's own videos
 * - Fetches IPFS manifests in parallel for everyone else
 * - Returns items in input order
 */
export function useResolvedVideoList(
  videos: VideoMeta[] | null,
): ResolvedListItem[] | null {
  const [items, setItems] = useState<ResolvedListItem[] | null>(null);

  useEffect(() => {
    if (!videos) {
      setItems(null);
      return;
    }
    let cancel = false;

    // Seed with localStorage where available — instant render for uploader
    const seeded: ResolvedListItem[] = videos.map((v) => {
      const local = getVideoMeta(v.id);
      const localSource: VideoSource | null = local?.videoCid
        ? { type: "ipfs", videoCid: local.videoCid, videoFormat: local.videoFormat }
        : null;
      return {
        video: v,
        title: local?.title ?? `Video #${v.id}`,
        description: local?.description ?? "",
        category: local?.category,
        videoCid: local?.videoCid ?? null,
        source: localSource,
        thumbnail: deriveThumb(localSource, local?.thumbnail),
        manifestResolved: false,
      };
    });
    setItems(seeded);

    // Resolve manifests with bounded concurrency. Fully parallel triggers
    // ERR_INSUFFICIENT_RESOURCES on the browser when many CIDs are racing
    // multiple gateways at once. A small cap (4 in-flight) is enough to
    // pipeline efficiently without saturating the per-host connection limit.
    //
    // We stream updates: each time a manifest resolves we splice the new
    // entry into the array and call setItems so cards upgrade progressively
    // instead of all flipping at the end.
    const CONCURRENCY = 4;
    const working = [...seeded];
    const pool = videos; // narrow for the inner closure
    let cursor = 0;

    async function worker() {
      while (cursor < pool.length) {
        const i = cursor++;
        const v = pool[i]!;
        const cid = extractCid(v.contentHash);
        if (!cid) continue;
        const m = await fetchManifest(cid);
        if (cancel || !m) continue;
        const source = getSource(m);
        working[i] = {
          video: v,
          title: m.title || seeded[i]!.title,
          description: m.description || seeded[i]!.description,
          category: m.category ?? seeded[i]!.category,
          videoCid: source.type === "ipfs" ? source.videoCid : null,
          source,
          thumbnail: deriveThumb(source, m.thumbnailCid),
          manifestResolved: true,
        };
        if (!cancel) setItems([...working]);
      }
    }

    void Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pool.length) }, worker),
    );

    return () => {
      cancel = true;
    };
  }, [videos]);

  return items;
}
