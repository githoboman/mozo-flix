import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Generates a short-lived, single-use Pinata API key scoped to pinFileToIPFS
 * only. The browser uses this key to upload the video file directly to
 * `api.pinata.cloud`, bypassing Vercel's 4.5 MB serverless function body
 * limit that was causing every real-world video upload to 500.
 *
 * The key expires after one use, so even if a MITM intercepted the response
 * they couldn't fill up your Pinata account.
 */
export async function POST(_req: NextRequest) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json(
      { error: "PINATA_JWT not set on the server." },
      { status: 500 },
    );
  }

  try {
    const res = await fetch("https://api.pinata.cloud/users/generateApiKey", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyName: `mozoflix-upload-${Date.now()}`,
        maxUses: 1,
        permissions: {
          endpoints: {
            pinning: {
              pinFileToIPFS: true,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          {
            error:
              "Pinata rejected the key request (HTTP " +
              res.status +
              "). The PINATA_JWT is missing, expired, or lacks admin scope to mint scoped keys. Generate a new admin JWT at https://app.pinata.cloud/developers/api-keys.",
          },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: `Pinata key generation failed: ${res.status} ${body.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      pinata_api_key: string;
      pinata_api_secret: string;
      JWT: string;
    };

    // Only hand back the JWT — cleanest form, single Authorization header.
    return NextResponse.json({ jwt: data.JWT });
  } catch (e) {
    const msg = (e as Error).message ?? "Failed to mint upload key";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
