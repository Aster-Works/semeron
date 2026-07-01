/**
 * モデル応答から JSON を頑健に取り出す（08 の各プロンプトは JSON を返す指示）。
 * ```json フェンス・前後の散文・配列/オブジェクト混在に耐える。純関数。
 */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;

  // 1) ```json ... ``` フェンスがあれば中身を優先
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates: string[] = [];
  if (fenced) candidates.push(fenced[1]);
  candidates.push(text);

  for (const c of candidates) {
    const trimmed = c.trim();
    // 2) そのままパースできれば最速
    const direct = tryParse<T>(trimmed);
    if (direct !== undefined) return direct;

    // 3) 最初の { または [ から対応する閉じ括弧までを走査して抽出
    const sliced = sliceBalanced(trimmed);
    if (sliced) {
      const parsed = tryParse<T>(sliced);
      if (parsed !== undefined) return parsed;
    }
  }
  return null;
}

function tryParse<T>(s: string): T | undefined {
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

/** 最初の { or [ から括弧の釣り合いが取れる位置までを切り出す（文字列リテラル内は無視）。 */
function sliceBalanced(s: string): string | null {
  const start = firstIndexOfAny(s, ["{", "["]);
  if (start < 0) return null;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function firstIndexOfAny(s: string, chars: string[]): number {
  let best = -1;
  for (const c of chars) {
    const idx = s.indexOf(c);
    if (idx >= 0 && (best < 0 || idx < best)) best = idx;
  }
  return best;
}

/** 配列・文字列などをゆるく string[] に正規化（reviewNotes 等の頑健化）。 */
export function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

export function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
