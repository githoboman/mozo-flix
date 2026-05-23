import { NextRequest, NextResponse } from "next/server";
import { pinFileToIPFS } from "@/lib/ipfs-server";

// Allow up to ~250MB uploads (configure on your host accordingly)
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const result = await pinFileToIPFS(file, {
      uploadedAt: new Date().toISOString(),
      kind: "video",
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = (e as Error).message ?? "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
