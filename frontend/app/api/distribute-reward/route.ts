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

    // Anti-fraud: server-side prechecks run in parallel so the user doesn't
    // wait for two sequential Hiro round-trips before the actual signing.
    // The on-chain contract enforces hard rules (has-claimed, pool balance);
    // we just reject obvious bogus requests early to save a wallet slot.
    const [video, already] = await Promise.all([
      getVideo(body.videoId).catch(() => null),
      hasClaimed(body.videoId, body.viewer).catch(() => false),
    ]);
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
