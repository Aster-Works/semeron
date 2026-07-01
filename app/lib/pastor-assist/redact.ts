/**
 * 名前の既定リダクション（07 Phase 5 "Redact names by default"、08 §5）。
 *
 * 教会の会員表示名を既知の辞書として、祈祷課題本文から名前を伏せてから AI へ渡す。
 * 教会スコープの固有名詞だけを対象にするので過剰リダクションを避けられる。
 * これは best-effort の二重防御であり、プロンプト側の「名前を出さない」指示と併用する。
 * 純関数。
 */

const PLACEHOLDER = "○○";
const MIN_TOKEN_LEN = 2;

export interface RedactionResult {
  text: string;
  redactedCount: number;
  redactedNames: string[];
}

export function redactNames(text: string, memberNames: string[]): RedactionResult {
  if (!text) return { text: "", redactedCount: 0, redactedNames: [] };

  // フルネームと、空白区切りの各パート（姓・名）を対象語に。長い語から先に置換する
  // （「山田 太郎」を先に潰し、その後で単独の「太郎」も潰す）。
  const tokens = new Set<string>();
  for (const raw of memberNames) {
    const name = (raw ?? "").trim();
    if (name.length >= MIN_TOKEN_LEN) tokens.add(name);
    for (const part of name.split(/\s+/)) {
      if (part.length >= MIN_TOKEN_LEN) tokens.add(part);
    }
  }
  const ordered = [...tokens].sort((a, b) => b.length - a.length);

  let out = text;
  let count = 0;
  const hit = new Set<string>();
  for (const token of ordered) {
    const re = new RegExp(escapeRegExp(token), "g");
    out = out.replace(re, () => {
      count++;
      hit.add(token);
      return PLACEHOLDER;
    });
  }
  return { text: out, redactedCount: count, redactedNames: [...hit] };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
