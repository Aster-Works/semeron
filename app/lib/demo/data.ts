/**
 * Semeron — 決定論的デモデータ（Phase 1）
 *
 * 07 の Demo data requirements を満たす:
 *  - 2 教会（永福南 / Grace）で将来のマルチテナントを示す
 *  - ロール: Pastor / Elder / Prayer Team / Group Leader / Member（+Owner/Guest）
 *  - 種別: devotion / prayer_request / reflection / testimony / announcement
 *  - visibility: pastor_only / prayer_team / group / church / anonymous_church（+elders）
 *  - status: draft / scheduled / pending_review / published / archived（+rejected）
 *  - 「センシティブで pending、明確に非公開」の祈祷課題を1件含む
 *
 * すべて実在人物・実データではないダミー。祈祷課題本文も架空。
 */

import type {
  AppNotification,
  AuditLog,
  Church,
  CompletionLog,
  ContentItem,
  Group,
  Localized,
  Membership,
  ModerationReview,
  Reaction,
} from "./types";
import { DEFAULT_RETENTION_POLICY } from "./types";

const L = (ja: string, en: string): Localized => ({ ja, en });

/** デモの固定「現在時刻」。今日 = 2026-07-01（JST）。 */
export const DEMO_NOW = new Date("2026-07-01T09:00:00+09:00");
export const DEMO_TODAY = "2026-07-01";

const T = {
  todayMorning: "2026-07-01T06:30:00+09:00",
  today8: "2026-07-01T08:10:00+09:00",
  tomorrowMorning: "2026-07-02T06:30:00+09:00",
  yesterday: "2026-06-30T06:30:00+09:00",
  lastWeek: "2026-06-24T06:30:00+09:00",
  weekAgo: "2026-06-25T21:00:00+09:00",
  in2weeks: "2026-07-15T00:00:00+09:00",
  expiredOn: "2026-06-28T00:00:00+09:00",
};

/* ============================================================
   Churches
   ============================================================ */
export const churches: Church[] = [
  {
    id: "ch_eifuku",
    slug: "eifuku-minami",
    name: L("永福南キリスト教会", "Eifuku Minami Christ Church"),
    defaultLocale: "ja",
    contentLanguages: ["ja"], // 日本語のみ配信
    timezone: "Asia/Tokyo",
    morningNotificationTime: "06:30",
    status: "active",
    plan: "standard",
    inviteCode: "EIFUKU-2026",
    aiAddonEnabled: true, // デモ: 永福南は AI アドオン購入済み
    pastorAssistEnabled: true, // デモ: 永福南は Pastor Assist を有効化
    allowPrayerAi: false, // 祈祷本文の AI 送信は既定オフ（opt-in）
    retentionPolicy: DEFAULT_RETENTION_POLICY,
    roleLabels: {},
  },
  {
    id: "ch_grace",
    slug: "grace-community",
    name: L("グレース・コミュニティ教会", "Grace Community Church"),
    defaultLocale: "en",
    contentLanguages: ["en", "es"], // 英語＋スペイン語で配信（第2言語は自由に選べる例）
    timezone: "America/Los_Angeles",
    morningNotificationTime: "07:00",
    status: "active",
    plan: "pro",
    inviteCode: "GRACE-2026",
    aiAddonEnabled: false,
    pastorAssistEnabled: false,
    allowPrayerAi: false,
    retentionPolicy: DEFAULT_RETENTION_POLICY,
    roleLabels: {},
  },
];

/* ============================================================
   Groups
   ============================================================ */
export const groups: Group[] = [
  {
    id: "grp_e_young",
    churchId: "ch_eifuku",
    name: L("青年会", "Young Adults"),
    description: L("学生・社会人の青年の集まり", "Students and young working adults"),
    leaderMembershipId: "mem_e_yuki",
    status: "active",
  },
  {
    id: "grp_e_family",
    churchId: "ch_eifuku",
    name: L("子育て世代", "Families"),
    description: L("子育て中の家庭の交わり", "Fellowship for parents raising children"),
    leaderMembershipId: "mem_e_hana",
    status: "active",
  },
  {
    id: "grp_g_men",
    churchId: "ch_grace",
    name: L("メンズグループ", "Men's Group"),
    status: "active",
  },
];

/* ============================================================
   Memberships（User と Member を分離。同一 User が複数教会に属せる前提）
   ============================================================ */
export const memberships: Membership[] = [
  // --- 永福南 ---
  {
    id: "mem_e_jimi",
    churchId: "ch_eifuku",
    userId: "user_jimi",
    displayName: "Jimi 牧師",
    email: "pastor@eifuku.example",
    status: "active",
    roles: ["owner", "pastor"],
    groupIds: [],
    joinedAt: "2026-01-05T00:00:00+09:00",
  },
  {
    id: "mem_e_hana",
    churchId: "ch_eifuku",
    userId: "user_hana",
    displayName: "佐藤 はな",
    email: "hana@eifuku.example",
    status: "active",
    roles: ["elder"],
    groupIds: ["grp_e_family"],
    joinedAt: "2026-01-10T00:00:00+09:00",
  },
  {
    id: "mem_e_ken",
    churchId: "ch_eifuku",
    userId: "user_ken",
    displayName: "高橋 健",
    email: "ken@eifuku.example",
    status: "active",
    roles: ["prayer_team"],
    groupIds: [],
    joinedAt: "2026-01-12T00:00:00+09:00",
  },
  {
    id: "mem_e_yuki",
    churchId: "ch_eifuku",
    userId: "user_yuki",
    displayName: "森 ゆき",
    email: "yuki@eifuku.example",
    status: "active",
    roles: ["group_leader", "member"],
    groupIds: ["grp_e_young"],
    joinedAt: "2026-02-01T00:00:00+09:00",
  },
  {
    id: "mem_e_aoi",
    churchId: "ch_eifuku",
    userId: "user_aoi",
    displayName: "田中 あおい",
    email: "aoi@eifuku.example",
    status: "active",
    roles: ["member"],
    groupIds: ["grp_e_young"],
    joinedAt: "2026-02-14T00:00:00+09:00",
  },
  {
    id: "mem_e_emi",
    churchId: "ch_eifuku",
    userId: "user_emi",
    displayName: "渡辺 えみ",
    email: "emi@eifuku.example",
    status: "active",
    roles: ["member"],
    groupIds: ["grp_e_family"],
    joinedAt: "2026-03-01T00:00:00+09:00",
  },
  {
    id: "mem_e_taro",
    churchId: "ch_eifuku",
    userId: "user_taro",
    displayName: "山田 太郎",
    email: "taro@eifuku.example",
    status: "active",
    roles: ["member"],
    groupIds: [],
    joinedAt: "2026-03-20T00:00:00+09:00",
  },
  {
    id: "mem_e_guest",
    churchId: "ch_eifuku",
    userId: null,
    displayName: "新来者（招待中）",
    email: "guest@eifuku.example",
    status: "invited",
    roles: ["guest"],
    groupIds: [],
  },
  // --- Grace（別教会。永福南から見えてはならない） ---
  {
    id: "mem_g_david",
    churchId: "ch_grace",
    userId: "user_david",
    displayName: "Pastor David Lee",
    email: "david@grace.example",
    status: "active",
    roles: ["owner", "pastor"],
    groupIds: [],
    joinedAt: "2026-01-08T00:00:00-08:00",
  },
  {
    id: "mem_g_sarah",
    churchId: "ch_grace",
    userId: "user_sarah",
    displayName: "Sarah Kim",
    email: "sarah@grace.example",
    status: "active",
    roles: ["elder"],
    groupIds: [],
    joinedAt: "2026-01-15T00:00:00-08:00",
  },
  {
    id: "mem_g_john",
    churchId: "ch_grace",
    userId: "user_john",
    displayName: "John Park",
    email: "john@grace.example",
    status: "active",
    roles: ["member"],
    groupIds: ["grp_g_men"],
    joinedAt: "2026-02-20T00:00:00-08:00",
  },
];

const base = (partial: Partial<ContentItem> & Pick<ContentItem, "id" | "churchId" | "type" | "status" | "visibility" | "title" | "body">): ContentItem => ({
  createdAt: T.yesterday,
  updatedAt: T.yesterday,
  ...partial,
});

/* ============================================================
   Content Items
   ============================================================ */
export const contentItems: ContentItem[] = [
  /* ---------- 永福南: デボーション ---------- */
  base({
    id: "ci_e_dev_today",
    churchId: "ch_eifuku",
    type: "devotion",
    status: "published",
    visibility: "church",
    authorMembershipId: "mem_e_jimi",
    devotionDate: DEMO_TODAY,
    title: L("山に向かって目を上げる", "Lifting Our Eyes to the Hills"),
    scriptureReference: "詩篇 121:1–2",
    scriptureTranslation: "新改訳2017",
    scriptureQuote: L(
      "私は山に向かって目を上げる。私の助けは、どこから来るのか。私の助けは主から来る。天地を造られたお方から。",
      "I lift up my eyes to the hills—where does my help come from? My help comes from the Lord, the Maker of heaven and earth.",
    ),
    copyrightNotice: "聖書 新改訳2017 ©2017 新日本聖書刊行会",
    body: L(
      "朝、目を覚ましたとき、私たちの心はどこを見ているでしょうか。今日の予定、心配事、まだ答えの出ない問題——そちらにばかり目が向いてしまう朝も、きっとあるのではないでしょうか。\n\n詩人は、まず「山に向かって目を上げる」と言います。そして問いかけます。「私の助けは、どこから来るのか」。彼はすぐに答えます。助けは、山そのものからではなく、その山をも造られた主から来るのです。\n\nきょう一日、私たちの助けは、天地を造られたお方から来ます。まず、その方に目を上げてまいりましょう。",
      "When we wake in the morning, where do our hearts look first? Toward today's schedule, our worries, the problems still without answers—there are mornings like that for all of us.\n\nThe psalmist says he first lifts his eyes to the hills. Then he asks, 'Where does my help come from?' And he answers at once: not from the hills themselves, but from the Lord who made them.\n\nToday, our help comes from the Maker of heaven and earth. Let us lift our eyes to Him first.",
    ),
    reflectionQuestion: L(
      "今朝、あなたの心が最初に向かっているのは何でしょうか。",
      "What did your heart turn to first this morning?",
    ),
    prayerGuide: L(
      "天の父よ。今日も、あなたに目を上げます。私の助けがあなたから来ることを信じさせてください。",
      "Father, today I lift my eyes to You. Help me trust that my help comes from You.",
    ),
    publishedAt: T.todayMorning,
    createdAt: T.yesterday,
    updatedAt: T.todayMorning,
  }),
  base({
    id: "ci_e_dev_tomorrow",
    churchId: "ch_eifuku",
    type: "devotion",
    status: "scheduled",
    visibility: "church",
    authorMembershipId: "mem_e_jimi",
    devotionDate: "2026-07-02",
    title: L("夜も昼も守られる", "Kept Night and Day"),
    scriptureReference: "詩篇 121:3–4",
    scriptureTranslation: "新改訳2017",
    body: L(
      "主は、あなたの足をよろけさせず、あなたを守る方はまどろむこともない——明日は、この約束に耳を傾けます。",
      "He will not let your foot slip—He who watches over you will not slumber. Tomorrow we listen to this promise.",
    ),
    reflectionQuestion: L("あなたが「眠れない」と感じるのはどんな時ですか。", "When do you feel you 'cannot sleep'?"),
    prayerGuide: L("眠らずに見守ってくださる主に、今夜をゆだねます。", "I entrust tonight to the One who never slumbers."),
    scheduledAt: T.tomorrowMorning,
  }),
  base({
    id: "ci_e_dev_draft",
    churchId: "ch_eifuku",
    type: "devotion",
    status: "draft",
    visibility: "church",
    authorMembershipId: "mem_e_jimi",
    devotionDate: "2026-07-03",
    title: L("助けは主から", ""), // 英語未翻訳（Locale status を示すため）
    scriptureReference: "詩篇 121:5–6",
    scriptureTranslation: "新改訳2017",
    body: L("下書き。主はあなたを守る方。右の手をおおう陰。……（推敲中）", ""),
    reflectionQuestion: L("", ""),
    prayerGuide: L("", ""),
  }),
  base({
    id: "ci_e_dev_archived",
    churchId: "ch_eifuku",
    type: "devotion",
    status: "archived",
    visibility: "church",
    authorMembershipId: "mem_e_jimi",
    devotionDate: "2026-06-24",
    title: L("先週のみことば", "Last Week's Word"),
    scriptureReference: "ピリピ 4:6–7",
    scriptureTranslation: "新改訳2017",
    body: L("何も思い煩わないで、あらゆることで祈りと願いをもって……（先週配信・アーカイブ済み）", "Do not be anxious about anything… (archived)"),
    publishedAt: T.lastWeek,
  }),

  /* ---------- 永福南: 祈祷課題 ---------- */
  // ★ センシティブで pending、明確に非公開の例（07 必須）
  base({
    id: "ci_e_pr_pending_sensitive",
    churchId: "ch_eifuku",
    type: "prayer_request",
    status: "pending_review",
    visibility: "prayer_team", // 承認前。会員には見えない
    requestedVisibility: "church",
    authorMembershipId: "mem_e_emi",
    anonymous: false,
    includesThirdParty: true,
    sensitiveFlags: ["health", "family_or_marriage", "third_party_information"],
    prayerOutcome: "open",
    title: L("母の入院と家族のこと", "My mother's hospitalization and our family"),
    body: L(
      "実家の母が先週から入院しています。検査の結果を待っているところで、家族もそれぞれ不安を抱えています。名前や病名は控えたいのですが、平安と、家族が支え合えるように祈っていただけたら嬉しいです。",
      "My mother was hospitalized last week. We are waiting for test results, and each of us in the family is anxious. I would rather not share names or the diagnosis, but I would be grateful if you could pray for peace and for our family to support one another.",
    ),
    createdAt: T.today8,
    updatedAt: T.today8,
  }),
  base({
    id: "ci_e_pr_church_open",
    churchId: "ch_eifuku",
    type: "prayer_request",
    status: "published",
    visibility: "church",
    authorMembershipId: "mem_e_taro",
    anonymous: false,
    prayerOutcome: "open",
    expiresAt: T.in2weeks,
    title: L("転職の決断のために", "For a job decision"),
    body: L(
      "今月、転職するかどうかを決めます。家族のことも考えつつ、神さまの導きを求めています。落ち着いて判断できるように祈ってください。",
      "This month I need to decide whether to change jobs. Thinking of my family too, I'm seeking God's guidance. Please pray that I can decide with a calm heart.",
    ),
    publishedAt: T.weekAgo,
  }),
  base({
    id: "ci_e_pr_anon",
    churchId: "ch_eifuku",
    type: "prayer_request",
    status: "published",
    visibility: "anonymous_church",
    authorMembershipId: "mem_e_aoi", // 一般会員には隠れ、管理者には見える
    anonymous: true,
    sensitiveFlags: ["faith_struggle"],
    prayerOutcome: "open",
    expiresAt: T.in2weeks,
    title: L("信仰が弱っているとき", "When faith feels weak"),
    body: L(
      "最近、祈りにも礼拝にも気持ちが向かず、信仰が弱っているように感じます。名前は出したくありませんが、また主に近づけるように祈っていただけますか。",
      "Lately I've struggled to pray or worship, and my faith feels weak. I'd rather stay anonymous, but could you pray that I would draw near to the Lord again?",
    ),
    publishedAt: T.weekAgo,
  }),
  base({
    id: "ci_e_pr_prayerteam",
    churchId: "ch_eifuku",
    type: "prayer_request",
    status: "published",
    visibility: "prayer_team",
    authorMembershipId: "mem_e_hana",
    prayerOutcome: "open",
    title: L("祈祷チームで覚えたい家庭", "A family for the prayer team to hold"),
    body: L(
      "ある家庭のことを、祈祷チームだけで静かに覚えていただきたいです。詳細は控えますが、和解と平安のために祈ってください。",
      "Please quietly hold a certain family in prayer, just within the prayer team. I'll keep details private—please pray for reconciliation and peace.",
    ),
    publishedAt: T.weekAgo,
  }),
  base({
    id: "ci_e_pr_pastoronly",
    churchId: "ch_eifuku",
    type: "prayer_request",
    status: "published",
    visibility: "pastor_only",
    authorMembershipId: "mem_e_taro",
    sensitiveFlags: ["finances"],
    prayerOutcome: "open",
    title: L("牧師にだけ相談したいこと", "Something to share only with the pastor"),
    body: L(
      "経済的なことで、牧師にだけご相談したいことがあります。個別にお時間をいただけたら幸いです。",
      "There is a financial matter I would like to share only with the pastor. I'd be grateful for some time to talk privately.",
    ),
    publishedAt: T.weekAgo,
  }),
  base({
    id: "ci_e_pr_group_young",
    churchId: "ch_eifuku",
    type: "prayer_request",
    status: "published",
    visibility: "group",
    groupId: "grp_e_young",
    authorMembershipId: "mem_e_aoi",
    prayerOutcome: "open",
    title: L("大学の試験と進路", "University exams and my path"),
    body: L("青年会のみんなに。試験と、これからの進路のことを覚えて祈ってもらえたら嬉しいです。", "For the young adults group: please pray for my exams and for my path ahead."),
    publishedAt: T.weekAgo,
  }),
  base({
    id: "ci_e_pr_answered",
    churchId: "ch_eifuku",
    type: "prayer_request",
    status: "published",
    visibility: "church",
    authorMembershipId: "mem_e_yuki",
    prayerOutcome: "thanksgiving",
    expiresAt: T.in2weeks,
    title: L("祖母の回復を感謝します", "Thankful for my grandmother's recovery"),
    body: L("先月お願いした祖母の体調、皆さんの祈りに支えられて回復に向かっています。感謝の報告です。", "The health of my grandmother, which I asked prayer for last month, is improving thanks to your prayers. A thanksgiving report."),
    publishedAt: T.weekAgo,
  }),
  base({
    id: "ci_e_pr_expired",
    churchId: "ch_eifuku",
    type: "prayer_request",
    status: "published",
    visibility: "church",
    authorMembershipId: "mem_e_taro",
    prayerOutcome: "open",
    expiresAt: T.expiredOn, // 期限切れ→会員リストから消える
    title: L("先週の集会のために（期限切れ）", "For last week's gathering (expired)"),
    body: L("先週の特別集会が守られるように、という祈祷課題。期限切れのため会員一覧からは消えます。", "A request for last week's special gathering. Expired, so it disappears from member lists."),
    publishedAt: T.lastWeek,
  }),
  base({
    id: "ci_e_pr_rejected",
    churchId: "ch_eifuku",
    type: "prayer_request",
    status: "rejected",
    visibility: "church",
    authorMembershipId: "mem_e_taro",
    sensitiveFlags: ["third_party_information"],
    prayerOutcome: "open",
    title: L("却下された投稿（他人の噂を含む）", "Rejected request (contained gossip)"),
    body: L("他の人の私的な事情を本人の同意なく含んでいたため、モデレーターが却下。通常会員には決して表示されない。", "Contained another person's private matter without consent; rejected by a moderator. Never shown to normal members."),
    publishedAt: undefined,
  }),

  /* ---------- 永福南: 応答・証し・お知らせ ---------- */
  base({
    id: "ci_e_ref_1",
    churchId: "ch_eifuku",
    type: "reflection",
    status: "published",
    visibility: "church",
    authorMembershipId: "mem_e_aoi",
    title: L("今日の応答", "Today's reflection"),
    body: L("「まず目を上げる」という一言が心に残りました。通勤前に、少しだけ立ち止まってみます。", "The phrase 'lift your eyes first' stayed with me. I'll pause for a moment before my commute."),
    publishedAt: T.today8,
    createdAt: T.today8,
    updatedAt: T.today8,
  }),
  base({
    id: "ci_e_ref_2",
    churchId: "ch_eifuku",
    type: "reflection",
    status: "published",
    visibility: "church",
    authorMembershipId: "mem_e_taro",
    title: L("今日の応答", "Today's reflection"),
    body: L("心配事のほうを先に見ていた朝でした。もう一度、山の向こうのお方に目を上げます。", "It was a morning when I looked at my worries first. I'll lift my eyes again to the One beyond the hills."),
    publishedAt: T.today8,
    createdAt: T.today8,
    updatedAt: T.today8,
  }),
  base({
    id: "ci_e_test_1",
    churchId: "ch_eifuku",
    type: "testimony",
    status: "published",
    visibility: "church",
    authorMembershipId: "mem_e_hana",
    title: L("小さな証し", "A small testimony"),
    body: L("不安な一週間でしたが、毎朝ここでみことばに触れる習慣が、静かな支えになりました。", "It was an anxious week, but the habit of meeting the Word here each morning became a quiet support."),
    publishedAt: T.weekAgo,
  }),
  base({
    id: "ci_e_ann_1",
    churchId: "ch_eifuku",
    type: "announcement",
    status: "published",
    visibility: "church",
    authorMembershipId: "mem_e_jimi",
    title: L("水曜の祈祷会", "Wednesday Prayer Meeting"),
    body: L("今週の祈祷会は水曜 19:30 からです。詩篇121篇を分かち合います。オンライン参加も歓迎です。", "This week's prayer meeting is Wednesday at 19:30. We'll share from Psalm 121. Online participation is welcome."),
    publishedAt: T.yesterday,
  }),

  /* ---------- Grace（別教会。永福南会員には一切見えないこと） ----------
     ※ Grace は「今日のデボーション」を未配信にして State 3（未配信画面）を
        デモで体験できるようにしている（デボーションは前日分のみ）。永福南は通常配信。 */
  base({
    id: "ci_g_dev_recent",
    churchId: "ch_grace",
    type: "devotion",
    status: "published",
    visibility: "church",
    authorMembershipId: "mem_g_david",
    // Grace はロサンゼルス時間。DEMO_NOW(7/1 09:00 JST)は現地では 6/30。
    // 現地「今日(6/30)」の配信を未実施にして State 3 を体験できるよう、前々日分のみ。
    devotionDate: "2026-06-29",
    // 英語＋スペイン語（Grace は2言語配信の例）。
    title: { en: "Do Not Be Afraid", es: "No temas" },
    scriptureReference: "Isaiah 41:10",
    scriptureTranslation: "NIV / RVR1960",
    scriptureQuote: {
      en: "So do not fear, for I am with you; do not be dismayed, for I am your God.",
      es: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios.",
    },
    copyrightNotice: "Scripture: NIV ©2011 Biblica / RVR1960",
    body: {
      en: "Fear tells us we are alone. God's promise is the opposite: 'I am with you.' Whatever the day holds, you are not carrying it by yourself.",
      es: "El miedo nos dice que estamos solos. La promesa de Dios es lo contrario: «Yo estoy contigo». Sea lo que traiga el día, no lo llevas tú solo.",
    },
    reflectionQuestion: {
      en: "Where do you most need to hear 'I am with you' today?",
      es: "¿Dónde necesitas más oír hoy «Yo estoy contigo»?",
    },
    prayerGuide: {
      en: "Lord, quiet my fear with Your presence. Thank You that You are with me.",
      es: "Señor, calma mi temor con tu presencia. Gracias porque estás conmigo.",
    },
    publishedAt: "2026-06-29T07:00:00-07:00",
  }),
  base({
    id: "ci_g_pr_1",
    churchId: "ch_grace",
    type: "prayer_request",
    status: "published",
    visibility: "church",
    authorMembershipId: "mem_g_john",
    prayerOutcome: "open",
    title: L("", "New job, new city"),
    body: L("", "Our family is moving for a new job. Please pray for a smooth transition and new friendships at church."),
    publishedAt: T.weekAgo,
  }),
  base({
    id: "ci_g_pr_pending",
    churchId: "ch_grace",
    type: "prayer_request",
    status: "pending_review",
    visibility: "prayer_team",
    requestedVisibility: "church",
    authorMembershipId: "mem_g_sarah",
    sensitiveFlags: ["health"],
    prayerOutcome: "open",
    title: L("", "A friend's health"),
    body: L("", "Praying for a friend facing a difficult diagnosis. Keeping details private for now."),
    createdAt: T.today8,
    updatedAt: T.today8,
  }),
];

/* ============================================================
   Reactions（達成感を煽らない。数は小さく現実的に）
   ============================================================ */
export const reactions: Reaction[] = [
  { id: "rx1", churchId: "ch_eifuku", contentItemId: "ci_e_dev_today", membershipId: "mem_e_aoi", type: "read", createdAt: T.today8 },
  { id: "rx2", churchId: "ch_eifuku", contentItemId: "ci_e_dev_today", membershipId: "mem_e_taro", type: "read", createdAt: T.today8 },
  { id: "rx3", churchId: "ch_eifuku", contentItemId: "ci_e_dev_today", membershipId: "mem_e_hana", type: "read", createdAt: T.today8 },
  { id: "rx4", churchId: "ch_eifuku", contentItemId: "ci_e_dev_today", membershipId: "mem_e_aoi", type: "prayed", createdAt: T.today8 },
  { id: "rx5", churchId: "ch_eifuku", contentItemId: "ci_e_dev_today", membershipId: "mem_e_hana", type: "prayed", createdAt: T.today8 },
  { id: "rx6", churchId: "ch_eifuku", contentItemId: "ci_e_pr_church_open", membershipId: "mem_e_hana", type: "prayed", createdAt: T.weekAgo },
  { id: "rx7", churchId: "ch_eifuku", contentItemId: "ci_e_pr_church_open", membershipId: "mem_e_aoi", type: "prayed", createdAt: T.weekAgo },
  { id: "rx8", churchId: "ch_eifuku", contentItemId: "ci_e_pr_anon", membershipId: "mem_e_taro", type: "prayed", createdAt: T.weekAgo },
  { id: "rx9", churchId: "ch_eifuku", contentItemId: "ci_e_ref_1", membershipId: "mem_e_hana", type: "amen", createdAt: T.today8 },
  { id: "rx10", churchId: "ch_eifuku", contentItemId: "ci_e_ref_1", membershipId: "mem_e_taro", type: "thanks", createdAt: T.today8 },
  { id: "rx11", churchId: "ch_eifuku", contentItemId: "ci_e_pr_answered", membershipId: "mem_e_hana", type: "thanks", createdAt: T.weekAgo },
];

/* ============================================================
   Completion Logs（本人だけが見られる。管理者には匿名集計のみ）
   ============================================================ */
export const completionLogs: CompletionLog[] = [
  { id: "cl1", churchId: "ch_eifuku", contentItemId: "ci_e_dev_today", membershipId: "mem_e_aoi", completedReadAt: T.today8, completedPrayedAt: T.today8 },
  { id: "cl2", churchId: "ch_eifuku", contentItemId: "ci_e_dev_today", membershipId: "mem_e_hana", completedReadAt: T.today8, completedPrayedAt: T.today8 },
  { id: "cl3", churchId: "ch_eifuku", contentItemId: "ci_e_dev_today", membershipId: "mem_e_taro", completedReadAt: T.today8 },
];

/* ============================================================
   Moderation Reviews
   ============================================================ */
export const moderationReviews: ModerationReview[] = [
  { id: "mr1", contentItemId: "ci_e_pr_rejected", churchId: "ch_eifuku", reviewerMembershipId: "mem_e_jimi", decision: "rejected", note: "本人以外の私的な事情を同意なく含むため。投稿者に個別に連絡済み。", createdAt: T.weekAgo },
  { id: "mr2", contentItemId: "ci_e_pr_church_open", churchId: "ch_eifuku", reviewerMembershipId: "mem_e_ken", decision: "approved", note: "内容確認のうえ、教会全体で共有。", createdAt: T.weekAgo },
];

/* ============================================================
   In-app Notifications（Inbox は静かな祈りのリマインダー）
   ============================================================ */
export const notifications: AppNotification[] = [
  {
    id: "nt1",
    churchId: "ch_eifuku",
    recipientMembershipId: "mem_e_aoi",
    type: "daily_devotion_published",
    category: "today",
    channel: "in_app",
    title: L("今日のみことばが届きました", "Today's Word has arrived"),
    body: L("詩篇 121:1–2「山に向かって目を上げる」", "Psalm 121:1–2 'Lifting Our Eyes to the Hills'"),
    status: "sent",
    sentAt: T.todayMorning,
    createdAt: T.todayMorning,
    read: false,
    mutedByRecipient: false,
  },
  {
    id: "nt2",
    churchId: "ch_eifuku",
    recipientMembershipId: "mem_e_taro",
    type: "prayer_request_approved",
    category: "prayer",
    channel: "in_app",
    title: L("祈祷課題が共有されました", "Your prayer request was shared"),
    body: L("「転職の決断のために」が教会全体に共有されました。", "'For a job decision' was shared with the whole church."),
    status: "sent",
    sentAt: T.weekAgo,
    createdAt: T.weekAgo,
    read: true,
    mutedByRecipient: false,
  },
  {
    id: "nt3",
    churchId: "ch_eifuku",
    recipientMembershipId: "mem_e_taro",
    type: "prayer_request_prayed",
    category: "social",
    channel: "in_app",
    title: L("あなたの祈祷課題が覚えられています", "Someone is praying with you"),
    body: L("2人があなたの祈祷課題のために祈りました。", "2 people prayed for your request."),
    status: "sent",
    sentAt: T.weekAgo,
    createdAt: T.weekAgo,
    read: false,
    mutedByRecipient: false,
  },
  // 通知失敗（管理画面 Notifications で失敗として表示する例）
  {
    id: "nt4",
    churchId: "ch_eifuku",
    recipientMembershipId: "mem_e_yuki",
    type: "daily_devotion_published",
    category: "today",
    channel: "web_push",
    title: L("今日のみことばが届きました", "Today's Word has arrived"),
    body: L("Web Push（未購読の端末）", "Web Push (device not subscribed)"),
    status: "failed",
    failureReason: "no_push_subscription",
    createdAt: T.todayMorning,
    mutedByRecipient: false,
  },
];

/* ============================================================
   Audit Logs（監査はプロダクト機能。開発ログではない）
   ============================================================ */
export const auditLogs: AuditLog[] = [
  { id: "al1", churchId: "ch_eifuku", actorMembershipId: "mem_e_jimi", action: "moderation.rejected", targetType: "content_item", targetId: "ci_e_pr_rejected", metadata: { reason: "third_party_information" }, createdAt: T.weekAgo },
  { id: "al2", churchId: "ch_eifuku", actorMembershipId: "mem_e_ken", action: "moderation.approved", targetType: "content_item", targetId: "ci_e_pr_church_open", createdAt: T.weekAgo },
  { id: "al3", churchId: "ch_eifuku", actorMembershipId: "mem_e_jimi", action: "invite.created", targetType: "membership", targetId: "mem_e_guest", createdAt: T.yesterday },
  { id: "al4", churchId: "ch_eifuku", actorMembershipId: "mem_e_jimi", action: "devotion.published", targetType: "content_item", targetId: "ci_e_dev_today", createdAt: T.todayMorning },
  { id: "al5", churchId: "ch_eifuku", actorMembershipId: "mem_e_jimi", action: "visibility.changed", targetType: "content_item", targetId: "ci_e_pr_pastoronly", metadata: { from: "church", to: "pastor_only" }, createdAt: T.weekAgo },
];
