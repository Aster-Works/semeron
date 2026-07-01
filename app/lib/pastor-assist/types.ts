import type { Localized, Visibility } from "@/app/lib/demo/types";

/**
 * Pastor Assist の結果型（07 Phase 5 / 08 AI Prompt Pack）。
 * すべて「下書き・提案」であり、保存や配信は必ず人間が別操作で行う。
 */

export type AssistDevotionKind = "draft_from_passage" | "suggest_questions" | "translate";

/** デボーション下書き（08 §3）。 */
export interface DevotionDraft {
  centralMessage: string;
  title: string;
  devotionalBody: string;
  reflectionQuestion: string;
  guidedPrayer: string;
  reviewNotes: string[];
}

/** 黙想の問い（08 §8）。 */
export interface ReflectionQuestionOption {
  question: string;
  bestFor: "personal" | "group" | "prayer";
}

/** 翻訳下書き（08 §7）。 */
export interface TranslationDraft {
  translatedText: string;
  translatorNotes: string[];
  permissionNotes: string[];
}

export type AssistRiskLevel = "low" | "medium" | "high" | "urgent";

/** 祈祷課題のセンシティブ確認（08 §5 + §10 危機対応）。公開可否は決めない。 */
export interface PrayerSensitiveReview {
  riskLevel: AssistRiskLevel;
  flags: string[];
  visibilityConcern: string;
  suggestedSaferVisibility: Visibility;
  publicSummaryDraft: string;
  moderatorNotes: string[];
  requiresHumanAttention: boolean;
}

/**
 * デボーション補助アクションが UI に返す下書き。
 * 各フィールドは Localized（言語→文字列）でフォームの該当言語キーへ差し込む。
 */
export interface DevotionAssistResult {
  kind: AssistDevotionKind;
  /** フォームへ差し込む下書き（該当言語キーのみ）。 */
  patch: {
    title?: Localized;
    body?: Localized;
    reflectionQuestion?: Localized;
    prayerGuide?: Localized;
  };
  /** 「箇所から下書き」の中心メッセージ（表示用）。 */
  centralMessage?: string;
  /** 「黙想の問いを提案」で返る複数候補（ユーザーが1つ選ぶ）。 */
  questionOptions?: ReflectionQuestionOption[];
  /** 牧師が確認すべき注意（レビュー用・保存されない）。 */
  reviewNotes: string[];
}
