import { NextResponse } from "next/server";
import { getHiddenVideoIds } from "@/lib/reports";

export const runtime = "nodejs";

/**
 * Public endpoint that returns the current set of video ids the platform
 * is refusing to show. Called from the client-side data path so browse /
 * library / recommendations / channel pages all filter the same list.
 *
 * Deliberately unauthenticated + public — moderation state should be
 * inspectable by anyone (transparency). The list can never contain data
 * that leaks a viewer's identity.
 */
export async function GET() {
  try {
    const ids = await getHiddenVideoIds();
    // Aggressive edge caching would break "hide immediately" UX. Short TTL
    // is fine — a hidden video won't ship rewards regardless because the
    // admin can also pair it with an on-chain deactivate.
    return new NextResponse(JSON.stringify({ ids }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "failed" },
      { status: 500 },
    );
  }
}
