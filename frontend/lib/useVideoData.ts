"use client";

import { useEffect, useState } from "react";
import {
  fetchManifest,
  extractCid,
  getSource,
  type VideoManifest,
  type VideoSource,
} from "./manifest";
import { getVideoMeta } from "./videoMeta";
import type { VideoMeta } from "./stacks-reads";

/**
 * Resolve display data for a video:
 *   1. localStorage videoMeta (fast path, uploader's machine)
 *   2. Pinata-pinned manifest (cross-browser, the source of truth)
 *   3. fall back to graceful defaults
 */
export type ResolvedVideoData = {
  title: string;
  description: string;
  category?: string;
  /** Resolved CID of the playable file when source is IPFS. Null for yt/x. */
  videoCid: string | null;
  /** Full source descriptor (ipfs / youtube / x). Null until manifest loads. */
  source: VideoSource | null;
  loading: boolean;
};

export function useVideoData(video: VideoMeta | null): ResolvedVideoData {
  const [data, setData] = useState<ResolvedVideoData>({
    title: video ? `Video #${video.id}` : "Loading…",
    description: "",
    videoCid: null,
    source: null,
    loading: true,
  });

  useEffect(() => {
    if (!video) return;
    let cancel = false;

    const local = getVideoMeta(video.id);
    if (local) {
      setData({
        title: local.title || `Video #${video.id}`,
        description: local.description || "",
        category: local.category,
        videoCid: local.videoCid ?? null,
        source: local.videoCid
          ? { type: "ipfs", videoCid: local.videoCid, videoFormat: "mp4" }
          : null,
        loading: true, // keep loading until manifest confirms source type
      });
    }

    const manifestCid = extractCid(video.contentHash);
    if (manifestCid) {
      fetchManifest(manifestCid).then((m: VideoManifest | null) => {
        if (cancel || !m) {
          setData((d) => ({ ...d, loading: false }));
          return;
        }
        const source = getSource(m);
        setData({
          title: m.title || local?.title || `Video #${video.id}`,
          description: m.description || local?.description || "",
          category: m.category ?? local?.category,
          videoCid: source.type === "ipfs" ? source.videoCid : null,
          source,
          loading: false,
        });
      });
    } else {
      setData((d) => ({ ...d, loading: false }));
    }

    return () => {
      cancel = true;
    };
  }, [video]);

  return data;
}
