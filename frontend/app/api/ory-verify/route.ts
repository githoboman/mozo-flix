import { NextResponse } from "next/server";

export const runtime = "edge";
// Verification file content never changes at runtime — cache aggressively
// so Orynth's re-check probes are cheap.
export const revalidate = 3600;

/**
 * Orynth ownership verification.
 *
 * Reached via a rewrite from `/.well-known/ory-verify.txt` (see
 * next.config.js). We serve it as an API route instead of a public/ file
 * because Next.js's static asset pipeline skips dot-prefixed folders,
 * which was breaking the download at the well-known path.
 *
 * If Orynth ever rotates the token, update the string below AND redeploy.
 */
const ORY_VERIFY = "ory-verify=orynth-e8dc7b27439948e98a9f66626f9c5976\n";

export function GET() {
  return new NextResponse(ORY_VERIFY, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
