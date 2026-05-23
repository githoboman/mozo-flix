/**
 * lib/ai.ts
 * Server-only client for Anthropic Claude API (direct, not via a proxy).
 *
 * Endpoint: POST https://api.anthropic.com/v1/messages
 * Docs: https://docs.anthropic.com/en/api/messages
 *
 * Configure via .env.local:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   ANTHROPIC_MODEL=claude-haiku-4-5  (default — cheapest fast model)
 *
 * Cost as of 2026: Haiku 4.5 is ~$0.25/M input, $1.25/M output.
 * A typical metadata call (~500 in, 200 out) = ~$0.0004 ≈ free in practice.
 */

type Msg = {
  role: "system" | "user" | "assistant";
  content: string;
};

function cfg() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY missing. Add it to .env.local (server-only). Get one at https://console.anthropic.com/settings/keys",
    );
  }
  return {
    apiKey,
    baseUrl:
      process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1",
    model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5",
  };
}

export async function chatCompletion(
  messages: Msg[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    /** Anthropic doesn't take a response_format flag; we steer via prompt. */
    responseFormat?: "text" | "json_object";
  } = {},
): Promise<string> {
  const { apiKey, baseUrl, model } = cfg();

  // Anthropic puts system prompt at the top level, not in messages.
  const sys = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const turns = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 800,
    temperature: opts.temperature ?? 0.4,
    messages: turns,
  };
  if (sys) body.system = sys;

  const res = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(`Anthropic error: ${data.error.message}`);
  }

  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error("Anthropic returned no text content");
  }
  return textBlock.text;
}

/** Strip ```json fences and parse. Throws if not valid JSON. */
export function parseJsonResponse<T>(raw: string): T {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(s) as T;
}
