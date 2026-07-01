/**
 * 配信コンテンツの言語カタログ。
 *
 * 重要: これは「UIアセットの言語(ja/en)」とは別物。
 * UI は ja/en のみだが、デボーション等のコンテンツを配信する言語は
 * 教会ごとに自由に選べる（例: 英語教会が第2言語にスペイン語や韓国語を追加）。
 * 表示名は各言語の母語表記（言語ピッカーの慣例）。
 */
export interface ContentLanguage {
  code: string;
  /** 母語表記の言語名（そのまま表示する）。 */
  name: string;
}

export const CONTENT_LANGUAGES: ContentLanguage[] = [
  { code: "ja", name: "日本語" },
  { code: "en", name: "English" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "tl", name: "Tagalog" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "fr", name: "Français" },
  { code: "id", name: "Bahasa Indonesia" },
];

/** 言語コード→表示名（未知コードはコードをそのまま返す）。 */
export function languageName(code: string): string {
  return CONTENT_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

/** 追加候補（すでに有効な言語を除いたカタログ）。 */
export function availableLanguages(active: string[]): ContentLanguage[] {
  return CONTENT_LANGUAGES.filter((l) => !active.includes(l.code));
}
