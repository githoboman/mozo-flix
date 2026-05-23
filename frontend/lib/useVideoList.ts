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

    // Resolve manifests in parallel
    Promise.all(
      videos.map(async (v, i) => {
        const cid = extractCid(v.contentHash);
        if (!cid) return seeded[i];
        const m = await fetchManifest(cid);
        if (!m) return seeded[i];
        const source = getSource(m);
        return {
          video: v,
          title: m.title || seeded[i].title,
          description: m.description || seeded[i].description,
          category: m.category ?? seeded[i].category,
          videoCid: source.type === "ipfs" ? source.videoCid : null,
          source,
          thumbnail: deriveThumb(source, m.thumbnailCid),
          manifestResolved: true,
        };
      }),
    ).then((resolved) => {
      if (cancel) return;
      setItems(resolved);
    });

    return () => {
      cancel = true;
    };
  }, [videos]);

  return items;
}
