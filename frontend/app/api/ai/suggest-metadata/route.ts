import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, parseJsonResponse } from "@/lib/ai";
import { takeToken } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  filename: string;
  durationSeconds?: number;
  creatorHandle?: string;
  freeformHint?: string;
};

type Suggestion = {
  title: string;
  description: string;
  category: string;
  tags: string[];
};

const SYSTEM = `You are an upload assistant for MOZOflix, a Bitcoin-secured "watch-to-earn" video platform on Stacks. Creators fund STX reward pools that viewers earn from when they watch their videos.

Your job is to generate clean, discoverable metadata from a raw video filename plus minimal context.

CONSTRAINTS:
- title: 8-60 characters, no quotes, no emojis, written in the active voice. Hook readers in 5 words.
- description: 1-3 sentences, max 220 chars. Explain what the viewer will learn or experience. No marketing fluff.
- category: pick exactly one from [Education, Gaming, DeFi, NFTs, News, Tech, Culture, Web3, Entertainment]
- tags: 3-6 single-word or short kebab-case tags useful for search (e.g. ["stacks", "clarity", "bitcoin-l2"])

OUTPUT FORMAT: strictly a JSON object with keys title, description, category, tags. No markdown, no commentary.`;

function buildUserPrompt(b: Body): string {
  const parts: string[] = [];
  parts.push(`Filename: "${b.filename}"`);
  if (b.durationSeconds) {
    const mins = Math.round(b.durationSeconds / 60);
    parts.push(`Duration: ~${mins} min`);
  }
  if (b.creatorHandle) parts.push(`Creator: ${b.creatorHandle}`);
  if (b.freeformHint) parts.push(`Creator's brief: ${b.freeformHint}`);
  parts.push("");
  parts.push("Generate the metadata JSON.");
  return parts.join("\n");
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit — LLM calls cost money & quota, cap at 10 / min / IP
    const rl = takeToken(`ai-meta:${getClientIp(req)}`, {
      capacity: 10,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limited. Try again in a moment." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as Body;
    if (!body.filename || typeof body.filename !== "string") {
      return NextResponse.json(
        { error: "filename required" },
        { status: 400 },
      );
    }

    const raw = await chatCompletion(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildUserPrompt(body) },
      ],
      { temperature: 0.6, maxTokens: 400 },
    );

    const parsed = parseJsonResponse<Suggestion>(raw);

    // Defensive sanitize
    const clean: Suggestion = {
      title: String(parsed.title ?? "").slice(0, 70).trim(),
      description: String(parsed.description ?? "").slice(0, 240).trim(),
      category: String(parsed.category ?? "Education").trim(),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .map((t) => String(t).toLowerCase().trim().replace(/\s+/g, "-"))
            .filter(Boolean)
            .slice(0, 8)
        : [],
    };

    return NextResponse.json(clean);
  } catch (e) {
    const msg = (e as Error).message ?? "AI suggestion failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
