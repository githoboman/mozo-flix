import { NextRequest, NextResponse } from "next/server";
import { takeToken } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  /**
   * Base64-encoded frames (no data URL prefix) from the video, jpeg or png.
   * We recommend ~5 frames from different timestamps.
   */
  frames: string[];
  /** Optional MIME type; defaults to image/jpeg. */
  mediaType?: "image/jpeg" | "image/png" | "image/webp";
};

type ModerationDecision = {
  decision: "allow" | "reject";
  reasons: string[];
  confidence: number;
  /** Raw scores per category — useful for admin review + tuning thresholds. */
  scores: {
    nudity: number;
    gore: number;
    violence: number;
    drugs: number;
    hate_symbols: number;
  };
};

const SYSTEM_PROMPT = `You are a strict content-safety classifier for MOZOflix, a decentralized watch-to-earn video platform. You are shown one or more still frames extracted from a video that a creator is trying to publish.

Your job is to detect whether the video contains any of the following:
- NUDITY: exposed genitalia, sexual acts, sexualized minors of any kind (immediate reject at any confidence)
- GORE: graphic wounds, dismemberment, corpses shown for shock value
- VIOLENCE: real depictions of assault, weapons pointed at people, blood in a real (non-fictional) context
- DRUGS: hard drug use, drug paraphernalia in an instructional/promotional context
- HATE_SYMBOLS: swastikas, KKK regalia, or other symbols of organized hate movements displayed positively

Fictional/dramatic depictions in movies, gameplay footage from mainstream games, medical education, news reporting, and standard fitness / dance content are ALLOWED.

Return a single JSON object with this exact shape and no other text:
{
  "scores": {
    "nudity": 0.0,
    "gore": 0.0,
    "violence": 0.0,
    "drugs": 0.0,
    "hate_symbols": 0.0
  },
  "reasons": ["short human-readable justifications for anything > 0.3"]
}

Each score is between 0.0 (definitely absent) and 1.0 (definitely present). Be conservative on ALLOW — when in doubt about mainstream content, score low.`;

/**
 * Any single category score above this triggers rejection. Nudity has a
 * lower threshold because we're PG-13 by policy.
 */
const THRESHOLDS = {
  nudity: 0.4,
  gore: 0.5,
  violence: 0.6,
  drugs: 0.55,
  hate_symbols: 0.35,
};

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit — moderation calls cost tokens
    const rl = takeToken(`moderate:${getClientIp(req)}`, {
      capacity: 20,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limited. Try again in a moment." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as Body;
    if (!Array.isArray(body.frames) || body.frames.length === 0) {
      return NextResponse.json(
        { error: "frames array required" },
        { status: 400 },
      );
    }
    if (body.frames.length > 8) {
      return NextResponse.json(
        { error: "too many frames (max 8)" },
        { status: 400 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Moderation isn't configured on this deployment (ANTHROPIC_API_KEY missing). Uploads are blocked until an admin fixes this.",
        },
        { status: 503 },
      );
    }

    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
    const mediaType = body.mediaType ?? "image/jpeg";

    const content: Array<
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
      | { type: "text"; text: string }
    > = [
      ...body.frames.map((data) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType,
          data,
        },
      })),
      {
        type: "text" as const,
        text: "Classify these frames per the system prompt. Return only the JSON object, no prose.",
      },
    ];

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      if (anthropicRes.status === 401) {
        return NextResponse.json(
          {
            error:
              "Moderation provider auth failed — ANTHROPIC_API_KEY is invalid or revoked.",
          },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: `Moderation upstream failed: ${anthropicRes.status} ${errText.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const raw = (await anthropicRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const textBlock = raw.content?.find((b) => b.type === "text");
    if (!textBlock?.text) {
      return NextResponse.json(
        { error: "Moderation returned no content" },
        { status: 502 },
      );
    }

    // Parse the JSON out — strip any ```json fences the model might add
    let parsed: {
      scores: ModerationDecision["scores"];
      reasons: string[];
    };
    try {
      let s = textBlock.text.trim();
      s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
      const start = s.indexOf("{");
      const end = s.lastIndexOf("}");
      if (start >= 0 && end > start) s = s.slice(start, end + 1);
      parsed = JSON.parse(s);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            "Moderation returned unparseable JSON. Blocking upload as a precaution.",
          detail: (e as Error).message,
        },
        { status: 502 },
      );
    }

    // Apply thresholds
    const scores = parsed.scores;
    const violations: string[] = [];
    (Object.keys(THRESHOLDS) as Array<keyof typeof THRESHOLDS>).forEach(
      (k) => {
        if ((scores?.[k] ?? 0) >= THRESHOLDS[k]) {
          violations.push(k);
        }
      },
    );

    const decision: ModerationDecision = {
      decision: violations.length > 0 ? "reject" : "allow",
      reasons: violations.length > 0 ? (parsed.reasons ?? violations) : [],
      confidence: violations.length > 0
        ? Math.max(...violations.map((v) => scores[v as keyof typeof scores] ?? 0))
        : 1 - Math.max(
            ...Object.values(scores ?? { nudity: 0, gore: 0, violence: 0, drugs: 0, hate_symbols: 0 }),
          ),
      scores: {
        nudity: scores?.nudity ?? 0,
        gore: scores?.gore ?? 0,
        violence: scores?.violence ?? 0,
        drugs: scores?.drugs ?? 0,
        hate_symbols: scores?.hate_symbols ?? 0,
      },
    };

    return NextResponse.json(decision);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "moderate-frames failed" },
      { status: 500 },
    );
  }
}
