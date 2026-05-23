"use client";

import { useEffect, useState } from "react";
import { useWallet } from "./useWallet";
import { useData } from "./DataProvider";
import { getCreatorProfile } from "./stacks-reads";

/**
 * Returns `true` if the connected wallet either:
 *  - owns at least one video on-chain, OR
 *  - has registered a mozoflix-creators profile.
 *
 * Reads from the shared DataProvider cache so the result is shared across
 * every component that needs to gate creator-only UI.
 */
export function useIsCreator(): { isCreator: boolean; loading: boolean } {
  const wallet = useWallet();
  const { getVideos } = useData();
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet.address) {
      setIsCreator(false);
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        // Fast path: cached video list (usually primed at app mount).
        const videos = await getVideos();
        if (cancel) return;
        const owns = videos.some((v) => v.creator === wallet.address);
        if (owns) {
          setIsCreator(true);
          setLoading(false);
          return;
        }
        // Slower path: check for a registered profile.
        const profile = await getCreatorProfile(wallet.address!);
        if (cancel) return;
        setIsCreator(!!profile);
        setLoading(false);
      } catch {
        if (!cancel) {
          setIsCreator(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [wallet.address, getVideos]);

  return { isCreator, loading };
}
