/**
 * Semeron — UI 文言辞書（ja/en）
 *
 * 07 の指示: 「simple local i18n dictionary for ja/en」。
 * ja と en を同じキーに並べて持つことで、翻訳漏れをテストで検出できる
 * （tests/unit/i18n.test.ts が全キーの ja/en 非空を検証）。
 *
 * コピーは 05_UI_UX Spec / 04 Data Model の文言を反映（センシティブ警告・
 * ソフトゲート・空状態など）。SNS的・達成競争的な表現は使わない（12 Copy Principles）。
 */
export const messages = {
  "app.name": { ja: "Semeron", en: "Semeron" },
  "app.tagline": {
    ja: "教会の毎日を、みことばと祈りでつなぐ。",
    en: "A daily rhythm of Scripture, prayer, and shared life for your church.",
  },

  // --- common ---
  "common.read": { ja: "読みました", en: "Read" },
  "common.iPrayed": { ja: "祈りました", en: "I prayed" },
  "common.prayed": { ja: "祈りました", en: "Prayed" },
  "common.pray": { ja: "祈る", en: "Pray" },
  "common.amen": { ja: "アーメン", en: "Amen" },
  "common.thanks": { ja: "感謝", en: "Thanks" },
  "common.cancel": { ja: "キャンセル", en: "Cancel" },
  "common.save": { ja: "保存", en: "Save" },
  "common.saveDraft": { ja: "下書き保存", en: "Save draft" },
  "common.publish": { ja: "公開する", en: "Publish" },
  "common.schedule": { ja: "予約する", en: "Schedule" },
  "common.back": { ja: "戻る", en: "Back" },
  "common.submit": { ja: "送信", en: "Submit" },
  "common.edit": { ja: "編集", en: "Edit" },
  "common.close": { ja: "閉じる", en: "Close" },
  "common.today": { ja: "今日", en: "Today" },
  "common.church": { ja: "教会", en: "Church" },
  "common.admin": { ja: "管理", en: "Admin" },
  "common.optional": { ja: "任意", en: "Optional" },
  "common.preview": { ja: "プレビュー", en: "Preview" },
  "common.continue": { ja: "続ける", en: "Continue" },
  "common.people": { ja: "人", en: "" },

  // --- member nav ---
  "nav.today": { ja: "今日", en: "Today" },
  "nav.prayer": { ja: "祈り", en: "Prayer" },
  "nav.groups": { ja: "グループ", en: "Groups" },
  "nav.inbox": { ja: "受信", en: "Inbox" },
  "nav.me": { ja: "自分", en: "Me" },

  // --- admin nav ---
  "adminNav.dashboard": { ja: "ダッシュボード", en: "Dashboard" },
  "adminNav.devotions": { ja: "デボーション", en: "Devotions" },
  "adminNav.prayerRequests": { ja: "祈祷課題", en: "Prayer Requests" },
  "adminNav.groups": { ja: "グループ", en: "Groups" },
  "adminNav.members": { ja: "メンバー", en: "Members" },
  "adminNav.notifications": { ja: "通知", en: "Notifications" },
  "adminNav.settings": { ja: "設定", en: "Settings" },
  "adminNav.backToMember": { ja: "会員画面へ", en: "Member view" },

  // --- roles ---
  "role.owner": { ja: "オーナー", en: "Owner" },
  "role.pastor": { ja: "牧師", en: "Pastor" },
  "role.elder": { ja: "役員", en: "Elder" },
  "role.staff": { ja: "スタッフ", en: "Staff" },
  "role.group_leader": { ja: "グループリーダー", en: "Group Leader" },
  "role.prayer_team": { ja: "祈祷チーム", en: "Prayer Team" },
  "role.member": { ja: "会員", en: "Member" },
  "role.guest": { ja: "ゲスト", en: "Guest" },

  // --- visibility ---
  "visibility.pastor_only": { ja: "牧師のみ", en: "Pastors only" },
  "visibility.elders": { ja: "牧師・役員のみ", en: "Pastors and elders" },
  "visibility.prayer_team": { ja: "祈祷チームのみ", en: "Prayer team" },
  "visibility.group": { ja: "小グループのみ", en: "My group" },
  "visibility.church": { ja: "教会全体", en: "Whole church" },
  "visibility.anonymous_church": { ja: "匿名で教会全体", en: "Whole church, anonymous" },

  // --- status ---
  "status.draft": { ja: "下書き", en: "Draft" },
  "status.scheduled": { ja: "予約済み", en: "Scheduled" },
  "status.pending_review": { ja: "承認待ち", en: "Pending review" },
  "status.published": { ja: "公開済み", en: "Published" },
  "status.rejected": { ja: "却下", en: "Rejected" },
  "status.archived": { ja: "アーカイブ", en: "Archived" },

  // --- outcome ---
  "outcome.open": { ja: "祈り続けています", en: "Ongoing" },
  "outcome.answered": { ja: "答えられました", en: "Answered" },
  "outcome.thanksgiving": { ja: "感謝の報告", en: "Thanksgiving" },

  // --- sensitive flags ---
  "flag.health": { ja: "健康", en: "Health" },
  "flag.mental_health": { ja: "こころの健康", en: "Mental health" },
  "flag.family_or_marriage": { ja: "家庭・結婚", en: "Family / marriage" },
  "flag.finances": { ja: "経済", en: "Finances" },
  "flag.minors": { ja: "未成年", en: "Minors" },
  "flag.third_party_information": { ja: "本人以外の情報", en: "Someone else's info" },
  "flag.faith_struggle": { ja: "信仰の葛藤", en: "Faith struggle" },
  "flag.legal_or_criminal": { ja: "法的な事柄", en: "Legal matter" },
  "flag.self_harm_or_immediate_danger": { ja: "緊急・安全", en: "Urgent / safety" },
  "flag.other": { ja: "その他", en: "Other" },

  // --- Today ---
  "today.word": { ja: "今日のみことば", en: "Today's Word" },
  "today.reflection": { ja: "黙想の問い", en: "Reflection" },
  "today.guidedPrayer": { ja: "祈りの導き", en: "A prayer to pray" },
  "today.pastorNote": { ja: "{pastor}の導き", en: "A word from your {pastor}" },
  "today.shareRequest": { ja: "祈祷課題を送る", en: "Share a prayer request" },
  "today.talkToPastor": { ja: "{pastor}に相談する", en: "Talk to a {pastor}" },
  "today.softGate.gentle": {
    ja: "まず今日のみことばに耳を傾けましょう。",
    en: "Begin with today's Scripture and prayer.",
  },
  "today.completedQuiet": {
    ja: "今日の分を受け取りました。よい一日を。",
    en: "You've received today's word. Go in peace.",
  },
  "today.afterTitle": { ja: "受け取ったあとに", en: "After you've received today" },
  "today.yourReflection": { ja: "今日の応答", en: "Your reflection" },
  "today.reflectionPlaceholder": {
    ja: "今日心に残った一節や、短い応答を書いてみましょう（任意）。",
    en: "Write a verse that stayed with you, or a short response (optional).",
  },
  "today.reflectionPost": { ja: "分かち合う", en: "Share" },
  "today.reflectionNote": {
    ja: "短い応答は、同じ教会の仲間に届きます。牧師の問いへの答えでも大丈夫です。",
    en: "Short reflections are shared with your church. Answering the pastor's question is welcome.",
  },
  "today.churchPrayers": { ja: "教会の祈祷課題", en: "Prayer requests" },
  "today.notPublishedTitle": {
    ja: "今日のデボーションはまだ配信されていません。",
    en: "Today's devotion hasn't been shared yet.",
  },
  "today.notPublishedBody": {
    ja: "少し待つか、直近の祈祷課題を見て祈ることができます。",
    en: "Please check back soon, or pray over the recent prayer requests below.",
  },
  "today.recentReflections": { ja: "みんなの応答", en: "Reflections from church" },

  // --- Prayer feed / form ---
  "prayer.feedTitle": { ja: "教会の祈祷課題", en: "Prayer requests" },
  "prayer.feedSubtitle": {
    ja: "覚えて、共に祈りましょう。",
    en: "Let us remember one another and pray together.",
  },
  "prayer.new": { ja: "祈祷課題を送る", en: "Share a request" },
  "prayer.empty": {
    ja: "まだ共有された祈祷課題はありません。必要があれば、{pastor}にだけ送ることもできます。",
    en: "No prayer requests have been shared yet. You can also send one to your {pastor} only.",
  },
  "prayer.prayedCount": { ja: "人が祈っています", en: "praying" },
  "prayer.pray": { ja: "覚えて祈る", en: "Pray for this" },
  "prayer.mineBadge": { ja: "あなたの投稿", en: "Your request" },
  "prayer.pendingNote": {
    ja: "この祈祷課題は承認待ちです。承認されると、選んだ範囲にだけ表示されます。",
    en: "This request is pending review. Once approved, it will appear only to the visibility you chose.",
  },
  "prayer.expiresOn": { ja: "表示期限", en: "Shown until" },
  "prayer.edited": { ja: "編集済み", en: "edited" },
  "prayer.anonSelf": { ja: "あなた（匿名で投稿）", en: "You (posted anonymously)" },
  "prayer.anonSelfNote": {
    ja: "他の人には匿名で表示されます。牧師や役員にも名前は表示されません。",
    en: "Others see this as anonymous — your name is hidden even from pastors and leaders.",
  },
  "prayer.edit": { ja: "編集する", en: "Edit" },
  "prayer.editTitle": { ja: "祈祷課題を編集", en: "Edit prayer request" },
  "prayer.editReReviewNote": {
    ja: "公開済みの課題を編集すると、もう一度承認待ちになります。",
    en: "Editing a published request sends it back for review.",
  },
  "prayer.anonymousLocked": {
    ja: "一度匿名にした課題は実名に戻せません。実名で出したいときは取り下げて投稿し直してください。",
    en: "Once anonymous, a request can't be un-anonymized. To post with your name, withdraw and repost.",
  },
  "prayer.withdraw": { ja: "取り下げる", en: "Withdraw" },
  "prayer.withdrawTitle": { ja: "祈祷課題を取り下げますか？", en: "Withdraw this request?" },
  "prayer.withdrawBody": {
    ja: "この祈祷課題を削除します。祈った記録も一緒に消え、元には戻せません。",
    en: "This deletes the request and its prayer records. This cannot be undone.",
  },
  "reflection.edited": { ja: "編集済み", en: "edited" },
  "reflection.edit": { ja: "編集する", en: "Edit" },

  "prayerForm.title": { ja: "祈祷課題を送る", en: "Share a prayer request" },
  "prayerForm.titleLabel": { ja: "タイトル", en: "Title" },
  "prayerForm.titlePlaceholder": { ja: "短い見出し（例：家族の健康のために）", en: "A short title (e.g. For my family's health)" },
  "prayerForm.bodyLabel": { ja: "祈ってほしいこと", en: "What would you like prayer for?" },
  "prayerForm.bodyPlaceholder": {
    ja: "詳しく書きすぎなくても大丈夫です。名前や病名は控えることもできます。",
    en: "You don't need to write too much. You may leave out names or diagnoses.",
  },
  "prayerForm.visibilityLabel": { ja: "公開範囲（必須）", en: "Who can see this? (required)" },
  "prayerForm.expiryLabel": { ja: "表示期限", en: "Show until" },
  "prayerForm.anonymousLabel": { ja: "名前を表示しない（匿名）", en: "Hide my name (anonymous)" },
  "prayerForm.thirdPartyLabel": {
    ja: "本人以外（家族・友人など）のことを含みます",
    en: "This includes information about someone else",
  },
  "prayerForm.pastorConsultLabel": {
    ja: "{pastor}に個別に相談したい",
    en: "I'd like to talk with a {pastor} personally",
  },
  "prayerForm.submit": { ja: "確認のために送る", en: "Submit for review" },
  "prayerForm.noticeTitle": { ja: "共有の前に", en: "Before you share" },
  "prayerForm.notice": {
    ja: "病気、家庭、経済、信仰状態、未成年、本人以外の情報など、慎重に扱うべき情報が含まれる場合は、公開範囲を確認し、必要であれば「{pastorOnly}」または「{prayerTeamOnly}」を選んでください。",
    en: "Prayer requests may include sensitive information such as health, family, finances, faith struggles, minors, or information about someone else. Please choose the visibility carefully. When in doubt, choose \"{pastorOnly}\".",
  },
  "prayerForm.broadWarningTitle": { ja: "公開範囲の確認", en: "Confirm visibility" },
  "prayerForm.broadWarning": {
    ja: "この祈祷課題は教会全体に共有されます。病気、家庭、経済、未成年、本人以外の情報が含まれる場合は、公開範囲を狭めることを検討してください。",
    en: "This request will be shared with the whole church. If it includes health, family, finances, minors, or information about someone else, consider choosing a narrower visibility.",
  },
  "prayerForm.broadContinue": { ja: "この範囲で送る", en: "Share with this visibility" },
  "prayerForm.narrow": { ja: "範囲を狭める", en: "Choose narrower" },
  "prayerForm.afterSubmitTitle": { ja: "送信しました", en: "Submitted" },
  "prayerForm.afterSubmit": {
    ja: "承認待ちです。{pastor}・{prayerTeam}が確認してから、選んだ範囲に表示されます。",
    en: "Your request is pending review. Your {pastor} or the {prayerTeam} will check it before it appears to the visibility you chose.",
  },

  // --- reflections ---
  "reflection.by": { ja: "応答", en: "Reflection" },

  // --- groups ---
  "groups.title": { ja: "小グループ", en: "Groups" },
  "groups.mine": { ja: "参加しているグループ", en: "Your groups" },
  "groups.empty": { ja: "まだ小グループに参加していません。", en: "You are not in a group yet." },
  "groups.leader": { ja: "リーダー", en: "Leader" },
  "groups.memberCount": { ja: "名", en: "members" },
  "groups.groupPrayers": { ja: "グループの祈祷課題", en: "Group prayer requests" },
  "groups.noGroupPrayers": { ja: "このグループの祈祷課題はまだありません。", en: "No prayer requests in this group yet." },

  // --- inbox ---
  "inbox.title": { ja: "受信", en: "Inbox" },
  "inbox.empty": { ja: "新しいお知らせはありません。", en: "No new notifications." },
  "inbox.quietNote": {
    ja: "ここは静かな祈りのリマインダーです。",
    en: "A quiet place for prayer reminders.",
  },
  "inbox.markAllRead": { ja: "すべて既読にする", en: "Mark all as read" },
  "inbox.tapToRead": { ja: "タップで既読にする", en: "Tap to mark as read" },

  // --- me ---
  "me.title": { ja: "自分", en: "Me" },
  "me.language": { ja: "言語", en: "Language" },
  "me.role": { ja: "教会での役割", en: "Your role" },
  "me.church": { ja: "所属教会", en: "Your church" },
  "me.leaveChurch": { ja: "教会を抜ける", en: "Leave church" },
  "me.leaveTitle": { ja: "この教会を抜ける", en: "Leave this church" },
  "me.leaveHint": {
    ja: "この教会スペースへのアクセスがなくなります。アカウントや過去の記録は削除されません。",
    en: "You will lose access to this church space. Your account and history are not deleted.",
  },
  "me.leaveBody": {
    ja: "この操作を行うと、この教会スペースに入れなくなります。アカウントや過去の祈祷課題・応答履歴は削除されません。",
    en: "After this, you will no longer be able to enter this church space. Your account, prayer requests, and response history are not deleted.",
  },
  "me.leaveConfirm": { ja: "抜ける", en: "Leave" },
  "me.deleteAccount": { ja: "アカウントを削除", en: "Delete account" },
  "me.deleteTitle": { ja: "アカウントを削除", en: "Delete account" },
  "me.deleteHint": {
    ja: "ログインできなくなります。教会内の履歴は削除ではなく匿名化されます。",
    en: "You will no longer be able to sign in. Church history is anonymized, not erased.",
  },
  "me.deleteBody": {
    ja: "この操作は元に戻せません。ログイン用アカウントを削除し、Semeron上の表示名とメールアドレスを匿名化します。過去の祈祷課題・応答・監査ログは教会の記録として残ります。",
    en: "This cannot be undone. Your sign-in account will be deleted, and your display name and email in Semeron will be anonymized. Past prayer requests, responses, and audit logs remain as church records.",
  },
  "me.deleteTypeLabel": { ja: "確認のため DELETE と入力", en: "Type DELETE to confirm" },
  "me.deleteTypeHint": {
    ja: "半角大文字で DELETE と入力すると削除できます。",
    en: "Enter DELETE in uppercase to enable deletion.",
  },
  "me.deleteConfirm": { ja: "削除する", en: "Delete" },
  "me.demoNote": {
    ja: "これはデモです。ログインや実データはまだありません。",
    en: "This is a demo. No real login or data yet.",
  },

  // --- admin dashboard ---
  "admin.dashboard": { ja: "ダッシュボード", en: "Dashboard" },
  "admin.todayDevotion": { ja: "今日のデボーション", en: "Today's devotion" },
  "admin.scheduledDevotions": { ja: "予約済みデボーション", en: "Scheduled devotions" },
  "admin.pendingPrayers": { ja: "承認待ちの祈祷課題", en: "Prayer requests to review" },
  "admin.weekAggregate": { ja: "今日の集計（匿名）", en: "Today (anonymous)" },
  "admin.readCount": { ja: "読了", en: "Read" },
  "admin.prayedCount": { ja: "祈り", en: "Prayed" },
  "admin.reflectionCount": { ja: "応答", en: "Reflections" },
  "admin.visibilityBreakdown": { ja: "公開範囲別の祈祷課題", en: "Prayer requests by visibility" },

  // --- 週次サマリー（Roadmap Phase 3・過去7日の匿名集計） ---
  "admin.weekly.title": { ja: "今週のあゆみ（匿名）", en: "This week (anonymous)" },
  "admin.weekly.subtitle": { ja: "過去7日間の集計です。", en: "Aggregates from the last 7 days." },
  "admin.weekly.devotions": { ja: "配信したみことば", en: "Devotions published" },
  "admin.weekly.read": { ja: "読了", en: "Read" },
  "admin.weekly.prayed": { ja: "祈り", en: "Prayed" },
  "admin.weekly.reflections": { ja: "応答", en: "Reflections" },
  "admin.weekly.newPrayers": { ja: "新しい祈祷課題", en: "New prayer requests" },
  "admin.weekly.approved": { ja: "承認した課題", en: "Approved" },
  "admin.weekly.pending": { ja: "承認待ち", en: "Pending review" },
  "admin.weekly.newMembers": { ja: "新しい会員", en: "New members" },
  "admin.notificationFailures": { ja: "通知の失敗", en: "Notification failures" },
  "admin.noIndividualNote": {
    ja: "個人別の完了状況や「信仰スコア」は表示しません。集計は匿名です。",
    en: "We never show individual completion data or a 'faithfulness score.' Aggregates are anonymous.",
  },
  "admin.reviewNow": { ja: "確認する", en: "Review" },
  "admin.notPublishedToday": { ja: "今日のデボーションは未公開です。", en: "Today's devotion isn't published yet." },
  "admin.openEditor": { ja: "エディタを開く", en: "Open editor" },

  // --- devotions list ---
  "devotions.title": { ja: "デボーション", en: "Devotions" },
  "devotions.new": { ja: "新しいデボーション", en: "New devotion" },
  "devotions.colDate": { ja: "日付", en: "Date" },
  "devotions.colTitle": { ja: "タイトル", en: "Title" },
  "devotions.colScripture": { ja: "聖書箇所", en: "Scripture" },
  "devotions.colLocale": { ja: "言語", en: "Locale" },
  "devotions.colStatus": { ja: "状態", en: "Status" },
  "devotions.colRead": { ja: "読了", en: "Read" },
  "devotions.colPrayed": { ja: "祈り", en: "Prayed" },
  "devotions.localeBoth": { ja: "日英", en: "JA / EN" },
  "devotions.localeJaOnly": { ja: "日本語のみ", en: "JA only" },
  "devotions.localeEnOnly": { ja: "英語のみ", en: "EN only" },
  "devotions.delete": { ja: "削除", en: "Delete" },
  "devotions.deleteTitle": { ja: "デボーションを削除しますか？", en: "Delete this devotion?" },
  "devotions.deleteBody": {
    ja: "この操作は元に戻せません。会員の既読・祈りの記録と応答へのリアクションも一緒に削除されます。",
    en: "This cannot be undone. Members' read/prayed records and reactions will also be deleted.",
  },
  "devotions.deleteConfirm": { ja: "削除する", en: "Delete" },
  "devotions.deleteError": {
    ja: "削除できませんでした。時間をおいて再度お試しください。",
    en: "Could not delete. Please try again in a moment.",
  },

  // --- editor ---
  "editor.newTitle": { ja: "デボーションを作成", en: "New devotion" },
  "editor.editTitle": { ja: "デボーションを編集", en: "Edit devotion" },
  "editor.date": { ja: "配信日", en: "Date" },
  "editor.scriptureRef": { ja: "聖書箇所", en: "Scripture reference" },
  "editor.translation": { ja: "翻訳（出典表示）", en: "Translation (attribution)" },
  "editor.scriptureQuote": { ja: "短い引用（任意）", en: "Short quotation (optional)" },
  "editor.scriptureQuoteHint": {
    ja: "聖書本文は短い引用のみ。翻訳ごとの引用ルールと出典表示を確認してください（章全体の保存は不可）。",
    en: "Keep Bible text to a short quotation only. Verify your translation's quotation rules and attribution (no storing whole chapters).",
  },
  "editor.titleField": { ja: "タイトル", en: "Title" },
  "editor.body": { ja: "本文", en: "Body" },
  "editor.reflection": { ja: "黙想の問い", en: "Reflection question" },
  "editor.prayer": { ja: "祈りの導き", en: "Guided prayer" },
  "editor.ja": { ja: "日本語", en: "Japanese" },
  "editor.en": { ja: "英語", en: "English" },
  "editor.languages": { ja: "配信する言語", en: "Languages to publish" },
  "editor.addLanguage": { ja: "言語を追加", en: "Add a language" },
  "editor.removeLanguage": { ja: "この言語をやめる", en: "Remove this language" },
  "editor.singleLangNote": {
    ja: "既定は1言語での配信です。必要なときだけ言語を追加できます。",
    en: "Published in one language by default. Add another only when you need it.",
  },
  "editor.visibility": { ja: "公開範囲", en: "Visibility" },
  "editor.scheduleAt": { ja: "予約配信", en: "Schedule" },
  "editor.previewHeading": { ja: "会員に見える形", en: "How members will see it" },
  "editor.publishNote": {
    ja: "公開すると、選んだ配信日に会員へ表示されます。",
    en: "Once published, members will see this on the chosen date.",
  },

  // --- Pastor Assist (Phase 1: disabled) ---
  "assist.title": { ja: "Pastor Assist", en: "Pastor Assist" },
  "assist.subtitle": { ja: "牧師・管理者の下書き補助（AI）", en: "Draft help for pastors and admins" },
  "assist.draftFromPassage": { ja: "箇所から下書き", en: "Draft from passage" },
  "assist.suggestQuestions": { ja: "黙想の問いを提案", en: "Suggest reflection questions" },
  "assist.translate": { ja: "翻訳の下書き", en: "Translate draft" },
  "assist.disabled": {
    ja: "Pastor Assist は次のフェーズで有効になります。AIの下書きは必ず牧師・管理者が確認してから保存されます。",
    en: "Pastor Assist will be enabled in a later phase. AI drafts will always require pastor or admin review before saving.",
  },
  "assist.draftLabel": { ja: "下書き", en: "Draft" },
  "assist.separateNote": {
    ja: "AIの補助と「公開」は別の操作です。AIが自動で配信することはありません。",
    en: "AI assist and Publish are separate actions. AI never publishes on its own.",
  },

  // --- Pastor Assist (Phase 5: enabled states) ---
  "assist.generating": { ja: "生成中…", en: "Generating…" },
  "assist.applyDraft": { ja: "この下書きを反映", en: "Insert this draft" },
  "assist.applied": {
    ja: "反映しました。内容を確認・編集してから保存してください。",
    en: "Inserted. Review and edit before saving.",
  },
  "assist.reviewNotes": { ja: "確認事項", en: "Review notes" },
  "assist.centralMessage": { ja: "中心メッセージ", en: "Central message" },
  "assist.pickQuestion": { ja: "問いを選んで反映", en: "Pick a question to insert" },
  "assist.notConfigured": {
    ja: "AIは未設定です（管理者が API キーを設定すると使えます）。",
    en: "AI is not configured (an admin can add an API key).",
  },
  "assist.error": {
    ja: "うまくいきませんでした。少し時間をおいて再度お試しください。",
    en: "Something went wrong. Please try again in a moment.",
  },
  "assist.needScripture": { ja: "先に聖書箇所を入力してください。", en: "Enter a Scripture reference first." },
  "assist.needText": { ja: "翻訳する本文がありません。", en: "There is no text to translate." },
  "assist.translateTo": { ja: "翻訳先の言語", en: "Translate to" },
  "assist.advisoryDraft": {
    ja: "以下はAIの下書きです。牧師・管理者が確認・編集してから保存します。",
    en: "Below is an AI draft. A pastor or admin reviews and edits it before saving.",
  },

  // --- Pastor Assist: prayer sensitive review (in moderation queue) ---
  "assist.review.title": { ja: "センシティブ確認（AI）", en: "Sensitive review (AI)" },
  "assist.review.run": { ja: "AIで確認する", en: "Review with AI" },
  "assist.review.confirmWarn": {
    ja: "この祈祷課題の本文をAIに送信して確認します。名前は既定で伏せられます。続けますか？",
    en: "This sends the prayer request text to AI for review. Names are redacted by default. Continue?",
  },
  "assist.review.confirm": { ja: "送信して確認", en: "Send & review" },
  "assist.review.cancel": { ja: "やめる", en: "Cancel" },
  "assist.review.riskLevel": { ja: "リスク度", en: "Risk level" },
  "assist.review.suggestedVisibility": { ja: "より安全な公開範囲（提案）", en: "Suggested safer visibility" },
  "assist.review.concern": { ja: "公開範囲の注意", en: "Visibility concern" },
  "assist.review.summaryDraft": { ja: "公開用の要約案", en: "Public summary draft" },
  "assist.review.applySummary": { ja: "この要約を公開用本文に入れる", en: "Use as public text" },
  "assist.review.applyVisibility": { ja: "この公開範囲を選ぶ", en: "Choose this visibility" },
  "assist.review.notes": { ja: "確認メモ", en: "Review notes" },
  "assist.review.attention": { ja: "人による確認が必要です。", en: "Needs human attention." },
  "assist.review.urgent": {
    ja: "緊急の可能性があります。牧師・管理者がすぐに確認し、必要なら地域の緊急窓口・専門機関へつないでください。",
    en: "This may be urgent. A pastor/admin should follow up immediately and, if needed, contact local emergency or safeguarding support.",
  },
  "assist.review.advisoryNote": {
    ja: "これはAIの提案です。承認・却下・公開範囲はあなたが判断します。",
    en: "These are AI suggestions. You decide approval, rejection, and visibility.",
  },
  "assist.review.disabledPrayerAi": {
    ja: "祈祷課題のAI確認は、設定で「祈祷本文のAI送信」を許可すると使えます。",
    en: "Prayer AI review is available once 'send prayer text to AI' is enabled in settings.",
  },
  "assist.risk.low": { ja: "低", en: "Low" },
  "assist.risk.medium": { ja: "中", en: "Medium" },
  "assist.risk.high": { ja: "高", en: "High" },
  "assist.risk.urgent": { ja: "緊急", en: "Urgent" },

  // --- Pastor Assist: 週次祈祷リスト（08 §9） ---
  "prayerList.link": { ja: "祈祷リスト", en: "Prayer list" },
  "prayerList.title": { ja: "週次祈祷リスト", en: "Weekly prayer list" },
  "prayerList.subtitle": {
    ja: "承認済みの祈祷課題を、祈祷会や小グループ向けに整理した下書きを作ります（AI補助・提案のみ）。",
    en: "Draft an organized prayer list from approved requests for your prayer meeting or small group (AI assist, draft only).",
  },
  "prayerList.disabled": {
    ja: "この機能は、設定で Pastor Assist と「祈祷課題のAI送信」を有効にすると使えます。",
    en: "Enable Pastor Assist and 'send prayer text to AI' in settings to use this.",
  },
  "prayerList.audience": { ja: "対象", en: "Audience" },
  "prayerList.audience.prayerMeeting": { ja: "祈祷会", en: "Prayer meeting" },
  "prayerList.audience.smallGroup": { ja: "小グループ", en: "Small group" },
  "prayerList.audience.pastors": { ja: "牧師・リーダーのみ", en: "Pastors / leaders only" },
  "prayerList.includeNames": { ja: "名前を含める", en: "Include names" },
  "prayerList.includeNamesHint": {
    ja: "既定はオフ（名前を伏せます）。牧師・リーダー限定の資料でのみ検討してください。",
    en: "Off by default (names hidden). Consider on only for pastors/leaders-only materials.",
  },
  "prayerList.note": {
    ja: "承認済み・期限内の課題のみが対象です。牧師のみの課題は「牧師・リーダー」を選んだときだけ含まれます。",
    en: "Only approved, non-expired requests are used. Pastor-only requests are included only for the pastors/leaders audience.",
  },
  "prayerList.generate": { ja: "祈祷リストを作る", en: "Generate list" },
  "prayerList.confirmWarn": {
    ja: "承認済みの祈祷課題の本文をAIに送って整理します。名前は既定で伏せられます。続けますか？",
    en: "This sends the approved prayer request text to AI to organize. Names are redacted by default. Continue?",
  },
  "prayerList.confirm": { ja: "送信して作成", en: "Send & generate" },
  "prayerList.empty": {
    ja: "対象になる承認済みの祈祷課題がありません。",
    en: "There are no approved prayer requests to include.",
  },
  "prayerList.copy": { ja: "コピー", en: "Copy" },
  "prayerList.copied": { ja: "コピーしました", en: "Copied" },
  "prayerList.advisoryNote": {
    ja: "これはAIの下書きです。公開・共有の前に必ず内容と公開範囲をご確認ください。",
    en: "This is an AI draft. Please review the content and visibility before sharing.",
  },

  // --- moderation ---
  "moderation.title": { ja: "祈祷課題の確認", en: "Prayer moderation" },
  "moderation.empty": { ja: "承認待ちの祈祷課題はありません。", en: "No prayer requests are waiting for review." },
  "moderation.author": { ja: "投稿者", en: "Author" },
  "moderation.requestedVisibility": { ja: "希望の公開範囲", en: "Requested visibility" },
  "moderation.recommendedVisibility": { ja: "推奨の公開範囲", en: "Recommended visibility" },
  "moderation.flags": { ja: "センシティブ", en: "Sensitive flags" },
  "moderation.body": { ja: "本文", en: "Request" },
  "moderation.publicEdit": { ja: "公開用の本文（編集できます）", en: "Public text (you can edit)" },
  "moderation.aiSummary": { ja: "AI要約案", en: "AI summary" },
  "moderation.approve": { ja: "承認して公開", en: "Approve & publish" },
  "moderation.reject": { ja: "却下", en: "Reject" },
  "moderation.askRevision": { ja: "修正を依頼", en: "Ask for revision" },
  "moderation.thirdPartyWarn": {
    ja: "本人以外の情報を含みます。同意と公開範囲に注意してください。",
    en: "Includes another person's information. Check consent and visibility carefully.",
  },
  "moderation.decisionNote": { ja: "判断メモ（監査に残ります）", en: "Decision note (recorded in audit log)" },

  // --- CSV 取り込み ---
  "import.title": { ja: "CSVから取り込み", en: "Import from CSV" },
  "import.subtitle": {
    ja: "既存の祈祷課題リスト（CSV）を取り込み、承認待ちに追加します。",
    en: "Import an existing prayer list (CSV) and add it to the review queue.",
  },
  "import.link": { ja: "CSV取り込み", en: "Import CSV" },
  "import.paste": { ja: "CSVを貼り付け", en: "Paste CSV" },
  "import.pastePlaceholder": {
    ja: "title,body,visibility,author_name,anonymous,expires_at,sensitive_flags",
    en: "title,body,visibility,author_name,anonymous,expires_at,sensitive_flags",
  },
  "import.chooseFile": { ja: "CSVファイルを選択", en: "Choose a CSV file" },
  "import.sample": { ja: "サンプルCSVをダウンロード", en: "Download sample CSV" },
  "import.formatNote": {
    ja: "列: title(必須), body(必須), visibility, author_name, anonymous, expires_at, sensitive_flags",
    en: "Columns: title (required), body (required), visibility, author_name, anonymous, expires_at, sensitive_flags",
  },
  "import.previewTitle": { ja: "取り込みプレビュー", en: "Preview" },
  "import.ready": { ja: "取り込み可能", en: "Ready" },
  "import.needsAttention": { ja: "確認が必要", en: "Needs attention" },
  "import.rows": { ja: "件", en: "rows" },
  "import.safeNote": {
    ja: "取り込んだ祈祷課題はすべて「承認待ち」になり、公開範囲は狭い既定（祈祷チームのみ）になります。公開前に必ず一件ずつ確認してください。",
    en: "All imported requests become “pending review” with a narrow default visibility (prayer team). Review each one before publishing.",
  },
  "import.defaulted": { ja: "既定に補正", en: "defaulted" },
  "import.doImport": { ja: "承認待ちに追加", en: "Add to review queue" },
  "import.demoNote": {
    ja: "デモでは実際の保存は行いません（Phase 2 で有効化されます）。",
    en: "Nothing is saved in the demo (this is enabled in Phase 2).",
  },
  "import.done": {
    ja: "件を承認待ちに追加しました（デモ）",
    en: "requests added to the review queue (demo)",
  },
  "import.empty": {
    ja: "CSVを貼り付けるか、ファイルを選択してください。",
    en: "Paste CSV or choose a file.",
  },
  "import.errMissingColumns": {
    ja: "必須の列（title と body）が見つかりません。",
    en: "Required columns (title and body) were not found.",
  },
  "import.errTitleRequired": { ja: "タイトルが空です", en: "Title is empty" },
  "import.errBodyRequired": { ja: "本文が空です", en: "Body is empty" },
  "import.errTitleBodyRequired": { ja: "タイトルと本文が空です", en: "Title and body are empty" },
  "import.errBadDate": { ja: "表示期限の形式が不正です（YYYY-MM-DD）", en: "Invalid date (use YYYY-MM-DD)" },
  "import.row": { ja: "行", en: "Row" },

  // --- members ---
  "members.title": { ja: "メンバー", en: "Members" },
  "members.colName": { ja: "名前", en: "Name" },
  "members.colRoles": { ja: "役割", en: "Roles" },
  "members.colGroups": { ja: "グループ", en: "Groups" },
  "members.colStatus": { ja: "状態", en: "Status" },
  "members.invite": { ja: "招待", en: "Invite" },
  "members.filterActive": { ja: "有効", en: "Active" },
  "members.filterInactive": { ja: "休止", en: "Inactive" },
  "members.filterRemoved": { ja: "削除済み", en: "Removed" },
  "members.filterAll": { ja: "すべて", en: "All" },
  "members.emptyFiltered": {
    ja: "この条件に当てはまるメンバーはいません。",
    en: "No members match this filter.",
  },
  "members.editRoles": { ja: "役割を編集", en: "Edit roles" },
  "members.editRolesHint": {
    ja: "この教会での役割を選びます。複数選択できます。役割の変更は監査ログに記録されます。",
    en: "Choose this member's roles in the church. Multiple allowed. Role changes are recorded in the audit log.",
  },
  "members.suspend": { ja: "休止", en: "Suspend" },
  "members.restore": { ja: "復帰", en: "Restore" },
  "members.suspendTitle": { ja: "メンバーを休止しますか？", en: "Suspend this member?" },
  "members.restoreTitle": { ja: "メンバーを復帰しますか？", en: "Restore this member?" },
  "members.suspendBody": {
    ja: "休止すると、このメンバーは教会スペースに入れなくなります。アカウントや投稿履歴は削除されません。",
    en: "Suspending this member removes access to the church space. Their account and history are not deleted.",
  },
  "members.restoreBody": {
    ja: "復帰すると、このメンバーは再び教会スペースに入れるようになります。",
    en: "Restoring this member gives them access to the church space again.",
  },
  "members.suspendConfirm": { ja: "休止する", en: "Suspend" },
  "members.restoreConfirm": { ja: "復帰する", en: "Restore" },
  "members.suspendSelf": {
    ja: "自分自身は休止できません。",
    en: "You cannot suspend yourself.",
  },
  "members.removeFromChurch": { ja: "教会から外す", en: "Remove from church" },
  "members.removeTitle": { ja: "このメンバーを教会から外しますか？", en: "Remove this member from the church?" },
  "members.removeBody": {
    ja: "このメンバーは教会スペースに入れなくなります。アカウントや過去の記録は削除されません。",
    en: "This member will lose access to the church space. Their account and history are not deleted.",
  },
  "members.removeConfirm": { ja: "外す", en: "Remove" },
  "members.removeSelf": {
    ja: "自分自身は管理画面から外せません。",
    en: "You cannot remove yourself from the admin page.",
  },

  // --- グループ管理（管理 > グループ） ---
  "groupsAdmin.create": { ja: "グループを作成", en: "Create group" },
  "groupsAdmin.createConfirm": { ja: "作成する", en: "Create" },
  "groupsAdmin.nameLabel": { ja: "グループ名", en: "Group name" },
  "groupsAdmin.descLabel": { ja: "説明（任意）", en: "Description (optional)" },
  "groupsAdmin.addMember": { ja: "追加", en: "Add" },
  "groupsAdmin.selectMember": { ja: "メンバーを選ぶ…", en: "Choose a member…" },
  "groupsAdmin.removeMember": { ja: "グループから外す", en: "Remove from group" },
  "groupsAdmin.makeLeader": { ja: "リーダーに設定", en: "Make leader" },
  "groupsAdmin.clearLeader": { ja: "リーダーを解除", en: "Clear leader" },
  "groupsAdmin.archive": { ja: "アーカイブ", en: "Archive" },
  "groupsAdmin.unarchive": { ja: "復元", en: "Restore" },
  "groups.archived": { ja: "アーカイブ済み", en: "Archived" },
  "members.inviteCode": { ja: "招待コード", en: "Invite code" },
  "members.statusActive": { ja: "有効", en: "Active" },
  "members.statusInvited": { ja: "招待中", en: "Invited" },
  "members.statusInactive": { ja: "休止", en: "Inactive" },
  "members.statusRemoved": { ja: "削除済み", en: "Removed" },

  // --- notifications (admin) ---
  "notifications.title": { ja: "通知", en: "Notifications" },
  "notifications.colType": { ja: "種類", en: "Type" },
  "notifications.colChannel": { ja: "チャネル", en: "Channel" },
  "notifications.colStatus": { ja: "状態", en: "Status" },
  "notifications.colWhen": { ja: "日時", en: "When" },
  "notifications.statusSent": { ja: "送信済み", en: "Sent" },
  "notifications.statusFailed": { ja: "失敗", en: "Failed" },
  "notifications.statusQueued": { ja: "送信待ち", en: "Queued" },
  "notifications.statusSkipped": { ja: "スキップ", en: "Skipped" },
  "notifications.fallbackNote": {
    ja: "Web Push が失敗しても、アプリ内通知とメールでフォローします。通知でアプリが止まることはありません。",
    en: "If Web Push fails, in-app and email follow up. Notifications never block the app.",
  },
  // 通知チャネル
  "channel.in_app": { ja: "アプリ内", en: "In-app" },
  "channel.email": { ja: "メール", en: "Email" },
  "channel.web_push": { ja: "Web Push", en: "Web Push" },
  // 通知イベント種別
  "notifType.daily_devotion_published": { ja: "デボーション公開", en: "Devotion published" },
  "notifType.daily_devotion_reminder": { ja: "デボーションのリマインド", en: "Devotion reminder" },
  "notifType.prayer_request_submitted_to_moderators": { ja: "祈祷課題の申請", en: "Prayer request submitted" },
  "notifType.prayer_request_approved": { ja: "祈祷課題の承認", en: "Prayer request approved" },
  "notifType.prayer_request_rejected": { ja: "祈祷課題の却下", en: "Prayer request rejected" },
  "notifType.prayer_request_prayed": { ja: "祈りのリアクション", en: "Prayer reaction" },
  "notifType.weekly_summary_to_admins": { ja: "週次サマリー", en: "Weekly summary" },

  // --- settings ---
  "settings.menu": { ja: "設定", en: "Settings" },
  "settings.theme": { ja: "テーマ", en: "Theme" },
  "settings.goAdmin": { ja: "管理画面へ", en: "Go to admin" },
  "settings.goMember": { ja: "会員画面へ", en: "Go to member view" },
  "settings.title": { ja: "教会の設定", en: "Church settings" },
  "settings.roleLabels": { ja: "役割の呼び方", en: "Role names" },
  "settings.roleLabelsHint": {
    ja: "教会での呼び方に合わせて表示名を変更できます（例: 役員→執事）。権限は変わりません。空欄は標準の呼び方になります。",
    en: "Rename how roles are displayed to match your church (e.g., Elder → Deacon). Permissions do not change. Leave blank for the default.",
  },
  "settings.churchName": { ja: "教会名", en: "Church name" },
  "settings.defaultLocale": { ja: "既定の言語", en: "Default language" },
  "settings.timezone": { ja: "タイムゾーン", en: "Time zone" },
  "settings.morningTime": { ja: "朝の通知時刻", en: "Morning notification time" },
  "settings.softGate": { ja: "ソフトゲート", en: "Soft gate" },
  "settings.softGate.gentle": { ja: "やさしく（既定）", en: "Gentle (default)" },
  "settings.softGate.focused": { ja: "集中", en: "Focused" },
  "settings.softGate.off": { ja: "オフ", en: "Off" },
  "settings.softGateHint": {
    ja: "アプリを開くと今日のみことばを最初に表示します。ハードロックはしません。緊急連絡・相談・祈祷課題投稿は常に開けます。",
    en: "The app opens to today's Scripture first. It never hard-locks. Emergency contact, pastoral help, and submitting a request are always available.",
  },
  "settings.plan": { ja: "プラン", en: "Plan" },
  "settings.inviteCode": { ja: "招待コード", en: "Invite code" },
  "settings.contentLanguages": { ja: "配信言語", en: "Content languages" },
  "settings.contentLanguagesHint": {
    ja: "この教会がデボーション等を配信する言語です。画面の日本語/英語とは別に、必要な言語（韓国語・スペイン語など）を自由に追加できます。既定は1言語。",
    en: "The languages this church distributes content in. Independent of the ja/en interface — add any languages you need (Korean, Spanish, …). One by default.",
  },
  "settings.primaryLang": { ja: "主言語", en: "Primary" },
  "settings.langDemoNote": {
    ja: "owner / pastor は配信言語を保存できます。先頭の言語が主言語です。",
    en: "Owners / pastors can save content languages. The first language is primary.",
  },
  "settings.biblePolicy": { ja: "聖書本文の扱い", en: "Bible text policy" },
  "settings.biblePolicyBody": {
    ja: "聖書本文は短い引用と箇所参照が中心です。翻訳ごとの権利を尊重し、出典を明記します。大量の本文内蔵はしません。",
    en: "Bible text is limited to short quotations and references. We respect each translation's rights, show attribution, and do not embed large amounts of text.",
  },

  // --- settings: Pastor Assist (Phase 5) ---
  "settings.pastorAssist": { ja: "Pastor Assist（AI補助）", en: "Pastor Assist (AI)" },
  "settings.pastorAssistHint": {
    ja: "牧師・管理者の下書きと確認を助けます。AIが自動で配信することはありません。",
    en: "Helps pastors and admins draft and review. AI never publishes on its own.",
  },
  "settings.allowPrayerAi": { ja: "祈祷課題の本文をAIに送る", en: "Send prayer request text to AI" },
  "settings.allowPrayerAiHint": {
    ja: "祈祷課題は要配慮情報を含みます。有効にすると、モデレータが確認操作をしたときだけ本文がAIに送られます（名前は既定で伏せます）。",
    en: "Prayer requests can be sensitive. When on, text is sent to AI only when a moderator explicitly runs a review (names redacted by default).",
  },
  "settings.assistSaved": { ja: "保存しました。", en: "Saved." },
  "settings.assistAdminOnly": {
    ja: "この設定は owner / pastor が変更できます。",
    en: "Only owner / pastor can change these settings.",
  },
  "settings.assistNotConfigured": {
    ja: "サーバーにAIキーが未設定のため、有効にしても実際の生成は行われません（設定は保存できます）。",
    en: "No AI key is configured on the server, so enabling this won't generate yet (the setting still saves).",
  },

  // --- login / join ---
  "login.title": { ja: "Semeron にログイン", en: "Log in to Semeron" },
  "login.subtitle": {
    ja: "メールアドレスとパスワードでログインします。",
    en: "Log in with your email and password.",
  },
  "login.email": { ja: "メールアドレス", en: "Email address" },
  "login.demoNote": {
    ja: "これはデモです。下から視点を選んで、実際の画面を体験できます。",
    en: "This is a demo. Choose a view below to explore the real screens.",
  },
  "login.enterDemo": { ja: "デモを開く", en: "Open the demo" },
  "login.chooseChurch": { ja: "教会を選ぶ", en: "Choose a church" },

  "join.title": { ja: "教会に参加", en: "Join your church" },
  "join.invitedBy": { ja: "招待されています", en: "You've been invited" },
  "join.displayName": { ja: "表示名", en: "Display name" },
  "join.codeLabel": { ja: "招待コード", en: "Invite code" },
  "join.join": { ja: "参加する", en: "Join" },
  "join.demoNote": {
    ja: "デモでは、参加すると今日のみことばに進みます。",
    en: "In the demo, joining takes you to today's Scripture.",
  },

  // --- demo shell ---
  "demo.badge": { ja: "デモ", en: "Demo" },
  "demo.viewingAs": { ja: "視点", en: "Viewing as" },
  "demo.switchChurch": { ja: "教会を切替", en: "Switch church" },
  "demo.openAdmin": { ja: "管理画面", en: "Admin" },
  "demo.openMember": { ja: "会員画面", en: "Member" },
  "demo.note": {
    ja: "視点を切り替えると、公開範囲（RLS相当）による見え方の違いを確認できます。",
    en: "Switch the viewer to see how visibility rules (RLS) change what's shown.",
  },

  // --- misc ---
  "misc.by": { ja: "投稿", en: "by" },
  "misc.anonymous": { ja: "匿名", en: "Anonymous" },
  "misc.scriptureFrom": { ja: "聖書", en: "Scripture" },
} as const;

export type MessageId = keyof typeof messages;
