import { NextRequest, NextResponse } from "next/server";
import { addReport } from "@/lib/reports";
import { takeToken } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Body = {
  videoId: number;
  reporterAddress: string;
  reason: string;
  detail?: string;
};

const VALID_REASONS = [
  "nudity",
  "violence",
  "hate",
  "harassment",
  "spam",
  "copyright",
  "misleading",
  "other",
] as const;

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit reports so a single actor can't spam-report competitors
    const ipLimit = takeToken(`report-ip:${getClientIp(req)}`, {
      capacity: 20,
      windowMs: 60_000,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many reports from this IP" },
        { status: 429 },
      );
    }

    const body = (await req.json()) as Body;
    if (
      typeof body.videoId !== "number" ||
      typeof body.reporterAddress !== "string" ||
      !/^(ST|SP)[0-9A-Z]{20,}$/.test(body.reporterAddress) ||
      typeof body.reason !== "string"
    ) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    if (!VALID_REASONS.includes(body.reason as (typeof VALID_REASONS)[number])) {
      return NextResponse.json(
        { error: `Reason must be one of: ${VALID_REASONS.join(", ")}` },
        { status: 400 },
      );
    }

    const walletLimit = takeToken(`report-wallet:${body.reporterAddress}`, {
      capacity: 5,
      windowMs: 60_000,
    });
    if (!walletLimit.allowed) {
      return NextResponse.json(
        { error: "Too many reports from this wallet" },
        { status: 429 },
      );
    }

    const result = await addReport({
      videoId: body.videoId,
      reporterAddress: body.reporterAddress,
      reason: body.reason,
      detail: body.detail?.slice(0, 500),
      createdAt: Date.now(),
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "report failed" },
      { status: 500 },
    );
  }
}
