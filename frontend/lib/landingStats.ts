/**
 * lib/landingStats.ts
 * Aggregate on-chain counters for the landing page hero.
 * Cheap to compute for an MVP-sized contract; cache aggressively when the
 * video count gets larger.
 */

import { listVideos, getPool } from "./stacks-reads";
import { microToStx } from "./stacks";

export type LandingStats = {
  totalVideos: number;
  uniqueCreators: number;
  totalDistributed: string; // formatted STX, e.g. "12.5"
  totalDistributedMicro: bigint;
};

export async function getLandingStats(): Promise<LandingStats> {
  try {
    const videos = await listVideos();
    const uniqueCreators = new Set(videos.map((v) => v.creator)).size;

    const pools = await Promise.all(videos.map((v) => getPool(v.id)));
    const totalDistributed = pools.reduce(
      (sum, p) => sum + p.totalDistributed,
      0n,
    );

    return {
      totalVideos: videos.length,
      uniqueCreators,
      totalDistributed: microToStx(totalDistributed),
      totalDistributedMicro: totalDistributed,
    };
  } catch {
    return {
      totalVideos: 0,
      uniqueCreators: 0,
      totalDistributed: "0",
      totalDistributedMicro: 0n,
    };
  }
}
