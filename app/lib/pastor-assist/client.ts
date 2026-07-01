import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Pastor Assist のモデル呼び出し（サーバー専用）。
 * env ゲート: ANTHROPIC_API_KEY 未設定なら isAssistConfigured() が false を返し、
 * アクション側は「未設定」を穏やかに返す（コアも他フェーズ同様ブロックしない）。
 */

const MODEL = process.env.PASTOR_ASSIST_MODEL || "claude-sonnet-5";

export function isAssistConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export class AssistNotConfiguredError extends Error {
  constructor() {
    super("pastor_assist_not_configured");
    this.name = "AssistNotConfiguredError";
  }
}

let cached: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cached) cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return cached;
}

export interface AssistResponse {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
}

/** system + user を1往復で送り、テキストを返す。JSON 抽出は呼び出し側で行う。 */
export async function runAssist(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<AssistResponse> {
  if (!isAssistConfigured()) throw new AssistNotConfiguredError();
  const anthropic = getClient();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1500,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return {
    text,
    usage: { inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens },
    model: MODEL,
  };
}
