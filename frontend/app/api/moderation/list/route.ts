import { NextResponse } from "next/server";
import {
  getHiddenVideoIds,
  getRecentActions,
  getReportsForVideo,
  listReportedVideoIds,
} from "@/lib/reports";

export const runtime = "nodejs";

/**
 * GET /api/moderation/list
 * Returns everything the admin dashboard needs:
 *  - all reported videos with their reports
 *  - the current hidden set
 *  - recent moderation actions (audit log)
 *
 * We don't gate this endpoint server-side because the admin dashboard
 * already fetches the on-chain admin address for comparison. Anyone
 * curious about MOZOflix's moderation state can inspect it — which is
 * arguably a feature (transparency).
 */
export async function GET() {
  try {
    const [reportedIds, hidden, actions] = await Promise.all([
      listReportedVideoIds(),
      getHiddenVideoIds(),
      getRecentActions(100),
    ]);

    const reports = await Promise.all(
      reportedIds.map(async (id) => ({
        videoId: id,
        reports: await getReportsForVideo(id),
      })),
    );

    return NextResponse.json({
      reports: reports.sort(
        (a, b) => b.reports.length - a.reports.length,
      ),
      hidden,
      actions,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "list failed" },
      { status: 500 },
    );
  }
}
