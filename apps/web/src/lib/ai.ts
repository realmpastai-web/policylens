import { z } from "zod";

export type AiProvider = "openai" | "anthropic";

export const aiFindingSchema = z.object({
  severity: z.enum(["high", "medium", "low"]),
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(1500),
  suggestion: z.string().trim().max(800).optional(),
});

export const aiReviewSchema = z.object({
  summary: z.string().trim().min(1).max(1000),
  findings: z.array(aiFindingSchema).max(8),
});

export type AiReview = z.infer<typeof aiReviewSchema>;

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
};

const TEXT_LIMIT = 12_000;

const INSTRUCTIONS = `You review policy and procedure drafts. Return JSON only, with this shape:
{"summary": string, "findings": [{"severity": "high"|"medium"|"low", "title": string, "message": string, "suggestion": string}]}
Rules:
- At most 8 findings.
- Ground every finding in the text. Quote a short phrase in the message.
- Do not invent names, dates, approvals, or organisational facts.
- Prefer gaps the wording leaves open: conflicting instructions, vague owners, steps that cannot be followed, missing operational detail.
- If the draft is clear, return an empty findings array and say so in the summary.
- Do not wrap the JSON in markdown.`;

export function buildPrompt(text: string): { prompt: string; truncated: boolean } {
  const truncated = text.length > TEXT_LIMIT;
  const body = truncated ? text.slice(0, TEXT_LIMIT) : text;
  const prompt = `${INSTRUCTIONS}\n\n${truncated ? `The draft was truncated to the first ${TEXT_LIMIT} characters.\n\n` : ""}DRAFT:\n${body}`;
  return { prompt, truncated };
}

export async function runAiReview(options: {
  provider: AiProvider;
  apiKey: string;
  model: string;
  text: string;
}): Promise<{ review: AiReview; truncated: boolean }> {
  const key = options.apiKey.trim();
  if (!key) throw new Error("Enter an API key. It stays in this tab.");
  const model = options.model.trim();
  if (!model) throw new Error("Enter a model name.");
  const { prompt, truncated } = buildPrompt(options.text);
  const raw =
    options.provider === "openai"
      ? await callOpenAi(key, model, prompt)
      : await callAnthropic(key, model, prompt);
  const parsed = parseJson(raw);
  const review = aiReviewSchema.safeParse(coerceReview(parsed));
  if (!review.success) {
    const issue = review.error.issues[0];
    throw new Error(
      `The model returned JSON that did not match the review schema${issue ? ` (${issue.path.join(".") || "root"}: ${issue.message})` : ""}.`,
    );
  }
  return { review: review.data, truncated };
}

function coerceReview(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as { findings?: unknown };
  if (Array.isArray(record.findings) && record.findings.length > 8) {
    return { ...record, findings: record.findings.slice(0, 8) };
  }
  return value;
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("The model did not return JSON.");
  }
}

interface OpenAiBody {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

interface AnthropicBody {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
}

async function callOpenAi(apiKey: string, model: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You reply with a single JSON object and nothing else." },
        { role: "user", content: prompt },
      ],
    }),
  });
  const body = await readJson<OpenAiBody>(response, "OpenAI");
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned an empty review.");
  }
  return content;
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const body = await readJson<AnthropicBody>(response, "Anthropic");
  const text = (body.content ?? [])
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
  if (!text) throw new Error("Anthropic returned an empty review.");
  return text;
}

async function readJson<T extends { error?: { message?: string } }>(response: Response, provider: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !payload) {
    const message = payload?.error?.message;
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${provider} rejected the API key.`);
    }
    throw new Error(message ? `${provider}: ${message}` : `${provider} returned ${response.status}.`);
  }
  return payload;
}
