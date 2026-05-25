import { NextRequest, NextResponse } from "next/server";
import { distributeReward } from "@/lib/stacks-server";
import { takeToken } from "@/lib/rateLimit";
import { getVideo, hasClaimed } from "@/lib/stacks-reads";

export const runtime = "nodejs";

type Body = {
  viewer: string;
  videoId: number;
  completion: number;
};

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (
      typeof body.viewer !== "string" ||
      !body.viewer.match(/^ST|^SP/) ||
      typeof body.videoId !== "number" ||
      typeof body.completion !== "number" ||
      body.completion < 0 ||
      body.completion > 100
    ) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    // Two-key rate limit: per-wallet AND per-IP.
    // Same wallet can only claim once per video anyway (contract enforces),
    // so 3 requests/min per wallet is plenty. Per-IP throttle prevents a
    // botnet from spinning up wallets and gas-griefing.
    const ipLimit = takeToken(`ip:${getClientIp(req)}`, {
      capacity: 30,
      windowMs: 60_000,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests from this IP", retryAfterMs: ipLimit.resetMs },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(ipLimit.resetMs / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }
    const walletLimit = takeToken(`wallet:${body.viewer}`, {
      capacity: 3,
      windowMs: 60_000,
    });
    if (!walletLimit.allowed) {
      return NextResponse.json(
        { error: "Wallet rate-limited", retryAfterMs: walletLimit.resetMs },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(walletLimit.resetMs / 1000)),
          },
        },
      );
    }

    // Anti-fraud: server-side prechecks. The on-chain contract enforces the
    // hard rules (has-claimed, pool balance) but we reject obvious bogus
    // requests here so we don't waste a wallet broadcast slot signing a tx
    // that's guaranteed to fail.
    const video = await getVideo(body.videoId).catch(() => null);
    if (!video) {
      return NextResponse.json(
        { error: "Video not found on-chain" },
        { status: 404 },
      );
    }
    if (!video.active) {
      return NextResponse.json(
        { error: "This video has been deactivated by the creator" },
        { status: 409 },
      );
    }
    if (body.completion < video.minCompletionPct) {
      return NextResponse.json(
        {
          error: `Reward gate is ${video.minCompletionPct}% — you reported ${body.completion}%. Keep watching.`,
        },
        { status: 403 },
      );
    }
    const already = await hasClaimed(body.videoId, body.viewer).catch(
      () => false,
    );
    if (already) {
      return NextResponse.json(
        { error: "This wallet has already earned the reward for this video" },
        { status: 409 },
      );
    }

    const result = await distributeReward(
      body.viewer,
      body.videoId,
      body.completion,
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = (e as Error).message ?? "distribute-reward failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
