import { NextRequest, NextResponse } from "next/server";
import { pinJsonToIPFS } from "@/lib/ipfs-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { name, payload } = (await req.json()) as {
      name?: string;
      payload?: unknown;
    };
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const result = await pinJsonToIPFS(payload, name ?? "manifest.json");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "pin failed" },
      { status: 500 },
    );
  }
}
