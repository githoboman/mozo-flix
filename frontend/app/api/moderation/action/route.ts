import { NextRequest, NextResponse } from "next/server";
import { flagCreator, hideVideo, unhideVideo } from "@/lib/reports";

export const runtime = "nodejs";

type Body = {
  videoId: number;
  action: "hide" | "unhide" | "flag-creator";
  adminAddress: string;
  creatorAddress?: string;
  reason?: string;
};

/**
 * Server-side authorization uses an env var, ADMIN_ADDRESSES — a
 * comma-separated list of Stacks addresses allowed to run moderation
 * actions. We don't call the on-chain admin contract from this API route
 * because our stacks-reads helpers use a relative URL that only resolves
 * in the browser (running them here would 404 or hang).
 *
 * If ADMIN_ADDRESSES isn't set, we fall back to NEXT_PUBLIC_CONTRACT_ADDRESS
 * (the deployer, which is the contract's initial owner on both testnet and
 * mainnet unless it's been transferred). Real production should always
 * set ADMIN_ADDRESSES explicitly.
 */
function isAdmin(address: string): boolean {
  const list = (
    process.env.ADMIN_ADDRESSES ??
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
    ""
  )
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  return list.includes(address);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (
      typeof body.videoId !== "number" ||
      !["hide", "unhide", "flag-creator"].includes(body.action) ||
      typeof body.adminAddress !== "string" ||
      !/^(ST|SP)[0-9A-Z]{20,}$/.test(body.adminAddress)
    ) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    if (!isAdmin(body.adminAddress)) {
      return NextResponse.json(
        { error: "Not authorized — admin wallet only" },
        { status: 403 },
      );
    }

    if (body.action === "hide") {
      const ok = await hideVideo(body.videoId, {
        adminAddress: body.adminAddress,
        reason: body.reason,
      });
      return NextResponse.json({ ok });
    }
    if (body.action === "unhide") {
      const ok = await unhideVideo(body.videoId, {
        adminAddress: body.adminAddress,
        reason: body.reason,
      });
      return NextResponse.json({ ok });
    }
    if (body.action === "flag-creator") {
      if (
        !body.creatorAddress ||
        !/^(ST|SP)[0-9A-Z]{20,}$/.test(body.creatorAddress)
      ) {
        return NextResponse.json(
          { error: "creatorAddress required for flag-creator" },
          { status: 400 },
        );
      }
      const ok = await flagCreator(body.creatorAddress, {
        adminAddress: body.adminAddress,
        reason: body.reason,
        videoId: body.videoId,
      });
      return NextResponse.json({ ok });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "action failed" },
      { status: 500 },
    );
  }
}
