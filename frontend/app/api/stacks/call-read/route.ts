/**
 * Same-origin proxy for Hiro's /v2/contracts/call-read.
 * The browser sometimes can't hit Hiro directly (CORS preflight, ISP throttle,
 * extensions). Sending the request via our Next.js server bypasses all of
 * that — the browser does a same-origin POST, and we do the WAN hop.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// Cache identical calls for 5 seconds to absorb burst reads from listVideos()
export const revalidate = 5;

const isMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";
const HIRO_API = isMainnet
  ? "https://api.hiro.so"
  : "https://api.testnet.hiro.so";

type Body = {
  contractAddress: string;
  contractName: string;
  functionName: string;
  sender: string;
  arguments: string[]; // 0x-prefixed serialized CV hex strings
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (
      !body.contractAddress ||
      !body.contractName ||
      !body.functionName ||
      !body.sender ||
      !Array.isArray(body.arguments)
    ) {
      return NextResponse.json(
        { error: "Invalid body" },
        { status: 400 },
      );
    }

    const url = `${HIRO_API}/v2/contracts/call-read/${body.contractAddress}/${body.contractName}/${body.functionName}`;

    let lastErr: string = "";
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: body.sender,
            arguments: body.arguments,
          }),
          // Hiro's response is small; tight timeout keeps us responsive.
          signal: AbortSignal.timeout(10_000),
        });

        if (res.status === 429 || res.status >= 500) {
          lastErr = `Hiro ${res.status}`;
          await new Promise((r) =>
            setTimeout(r, 200 * Math.pow(2, attempt)),
          );
          continue;
        }

        if (!res.ok) {
          const text = await res.text();
          return NextResponse.json(
            { error: `Hiro ${res.status}: ${text.slice(0, 200)}` },
            { status: res.status },
          );
        }

        const data = await res.json();
        return NextResponse.json(data);
      } catch (e) {
        lastErr = (e as Error).message ?? "fetch failed";
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
      }
    }

    return NextResponse.json(
      { error: `Hiro unreachable after retries: ${lastErr}` },
      { status: 502 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "proxy failed" },
      { status: 500 },
    );
  }
}
