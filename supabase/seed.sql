-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ seed.sql — 2教会分のデモデータ（db reset 時に postgres として投入）   ║
-- ║ Phase 1 の app/lib/demo/data.ts に対応。RLS はここでは適用されない。   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── auth.users（membership.user_id の FK 用。ローカル検証のため password 認証可）──
-- 全員パスワード = 'password123'（ローカルseedのみ。email_confirmed 済み）。
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
   confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated', u.email,
       extensions.crypt('password123', extensions.gen_salt('bf')), now(), now(), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('display_name', u.name),
       '', '', '', ''
from (values
  ('a0000000-0000-0000-0000-0000000000e1','jimi@eifuku.example','Jimi 牧師'),
  ('a0000000-0000-0000-0000-0000000000e2','hana@eifuku.example','佐藤 はな'),
  ('a0000000-0000-0000-0000-0000000000e3','ken@eifuku.example','高橋 健'),
  ('a0000000-0000-0000-0000-0000000000e4','yuki@eifuku.example','森 ゆき'),
  ('a0000000-0000-0000-0000-0000000000e5','aoi@eifuku.example','田中 あおい'),
  ('a0000000-0000-0000-0000-0000000000e6','emi@eifuku.example','渡辺 えみ'),
  ('a0000000-0000-0000-0000-0000000000e7','taro@eifuku.example','山田 太郎'),
  ('a0000000-0000-0000-0000-0000000000e8','staff@eifuku.example','事務 スタッフ'),
  ('b0000000-0000-0000-0000-0000000000d1','david@grace.example','Pastor David Lee'),
  ('b0000000-0000-0000-0000-0000000000d2','sarah@grace.example','Sarah Kim'),
  ('b0000000-0000-0000-0000-0000000000d3','john@grace.example','John Park')
) as u(id, email, name);

-- email identity（GoTrue のパスワードログインに必要）
insert into auth.identities (id, user_id, provider_id, identity_data, provider,
                             last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), au.id, au.id::text,
       jsonb_build_object('sub', au.id::text, 'email', au.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users au
where au.email like '%@eifuku.example' or au.email like '%@grace.example';

-- ── churches ───────────────────────────────────────────────────────────
insert into public.churches (id, slug, name, default_locale, content_languages, timezone, morning_notification_time, plan, invite_code) values
  ('11111111-1111-1111-1111-111111111111','eifuku-minami',
    '{"ja":"永福南キリスト教会","en":"Eifuku Minami Christ Church"}', 'ja', array['ja'],
    'Asia/Tokyo','06:30','standard','EIFUKU-2026'),
  ('22222222-2222-2222-2222-222222222222','grace-community',
    '{"ja":"グレース・コミュニティ教会","en":"Grace Community Church"}', 'en', array['en','es'],
    'America/Los_Angeles','07:00','pro','GRACE-2026');

-- ── memberships ────────────────────────────────────────────────────────
insert into public.memberships (id, church_id, user_id, display_name, email, status, joined_at) values
  ('c1000000-0000-0000-0000-0000000000e1','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-0000000000e1','Jimi 牧師','jimi@eifuku.example','active','2026-01-05'),
  ('c1000000-0000-0000-0000-0000000000e2','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-0000000000e2','佐藤 はな','hana@eifuku.example','active','2026-01-10'),
  ('c1000000-0000-0000-0000-0000000000e3','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-0000000000e3','高橋 健','ken@eifuku.example','active','2026-01-12'),
  ('c1000000-0000-0000-0000-0000000000e4','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-0000000000e4','森 ゆき','yuki@eifuku.example','active','2026-02-01'),
  ('c1000000-0000-0000-0000-0000000000e5','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-0000000000e5','田中 あおい','aoi@eifuku.example','active','2026-02-14'),
  ('c1000000-0000-0000-0000-0000000000e6','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-0000000000e6','渡辺 えみ','emi@eifuku.example','active','2026-03-01'),
  ('c1000000-0000-0000-0000-0000000000e7','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-0000000000e7','山田 太郎','taro@eifuku.example','active','2026-03-20'),
  ('c1000000-0000-0000-0000-0000000000e8','11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-0000000000e8','事務 スタッフ','staff@eifuku.example','active','2026-02-05'),
  ('c2000000-0000-0000-0000-0000000000d1','22222222-2222-2222-2222-222222222222','b0000000-0000-0000-0000-0000000000d1','Pastor David Lee','david@grace.example','active','2026-01-08'),
  ('c2000000-0000-0000-0000-0000000000d2','22222222-2222-2222-2222-222222222222','b0000000-0000-0000-0000-0000000000d2','Sarah Kim','sarah@grace.example','active','2026-01-15'),
  ('c2000000-0000-0000-0000-0000000000d3','22222222-2222-2222-2222-222222222222','b0000000-0000-0000-0000-0000000000d3','John Park','john@grace.example','active','2026-02-20');

-- ── membership_roles ───────────────────────────────────────────────────
insert into public.membership_roles (membership_id, role) values
  ('c1000000-0000-0000-0000-0000000000e1','owner'),
  ('c1000000-0000-0000-0000-0000000000e1','pastor'),
  ('c1000000-0000-0000-0000-0000000000e2','elder'),
  ('c1000000-0000-0000-0000-0000000000e3','prayer_team'),
  ('c1000000-0000-0000-0000-0000000000e4','group_leader'),
  ('c1000000-0000-0000-0000-0000000000e4','member'),
  ('c1000000-0000-0000-0000-0000000000e5','member'),
  ('c1000000-0000-0000-0000-0000000000e6','member'),
  ('c1000000-0000-0000-0000-0000000000e7','member'),
  ('c1000000-0000-0000-0000-0000000000e8','staff'),
  ('c2000000-0000-0000-0000-0000000000d1','owner'),
  ('c2000000-0000-0000-0000-0000000000d1','pastor'),
  ('c2000000-0000-0000-0000-0000000000d2','elder'),
  ('c2000000-0000-0000-0000-0000000000d3','member');

-- ── groups / group_memberships ─────────────────────────────────────────
insert into public.groups (id, church_id, name, description, leader_membership_id) values
  ('d1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','{"ja":"青年会","en":"Young Adults"}','{"ja":"学生・社会人の青年","en":"Students and young adults"}','c1000000-0000-0000-0000-0000000000e4'),
  ('d1000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','{"ja":"子育て世代","en":"Families"}',null,'c1000000-0000-0000-0000-0000000000e2'),
  ('d2000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','{"ja":"メンズグループ","en":"Men''s Group"}',null,null);

insert into public.group_memberships (group_id, membership_id, role) values
  ('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-0000000000e4','leader'),
  ('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-0000000000e5','member'),
  ('d1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-0000000000e2','member'),
  ('d1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-0000000000e6','member'),
  ('d2000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-0000000000d3','member');

-- ── content_items（Eifuku）─────────────────────────────────────────────
insert into public.content_items
  (id, church_id, group_id, author_membership_id, type, status, visibility, title, body,
   scripture_reference, scripture_translation, scripture_quote, reflection_question, prayer_guide,
   requested_visibility, anonymous, includes_third_party, sensitive_flags, prayer_outcome,
   published_at, expires_at, devotion_date)
values
  -- 今日のデボーション（published / church）
  ('e1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e1',
   'devotion','published','church',
   '{"ja":"山に向かって目を上げる"}','{"ja":"朝、私たちの心はどこを見ているでしょうか。まず山の向こうのお方に目を上げましょう。"}',
   '詩篇 121:1–2','新改訳2017','{"ja":"私は山に向かって目を上げる。私の助けは、どこから来るのか。"}',
   '{"ja":"今朝、心が最初に向かっているのは何でしょうか。"}','{"ja":"天の父よ、今日もあなたに目を上げます。"}',
   null,false,false,'{}',null,now(),null,now()::date),
  -- 予約（scheduled）
  ('e1000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e1',
   'devotion','scheduled','church','{"ja":"夜も昼も守られる"}','{"ja":"主はまどろむこともない。"}',
   '詩篇 121:3–4','新改訳2017',null,null,null,null,false,false,'{}',null,null,null,'2026-07-02'),
  -- 下書き（draft）
  ('e1000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e1',
   'devotion','draft','church','{"ja":"助けは主から"}','{"ja":"（推敲中）"}',
   '詩篇 121:5–6','新改訳2017',null,null,null,null,false,false,'{}',null,null,null,'2026-07-03'),
  -- ★ センシティブで pending（prayer_team・第三者情報）
  ('e1000000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e6',
   'prayer_request','pending_review','prayer_team',
   '{"ja":"母の入院と家族のこと"}','{"ja":"母が入院しています。名前や病名は控えたいのですが、平安のために祈ってください。"}',
   null,null,null,null,null,'church',false,true,'{health,family_or_marriage,third_party_information}','open',null,null,null),
  -- 公開（church）
  ('e1000000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e7',
   'prayer_request','published','church','{"ja":"転職の決断のために"}','{"ja":"今月、転職を決めます。落ち着いて判断できるように。"}',
   null,null,null,null,null,'church',false,false,'{}','open','2026-06-25T21:00:00+09:00','2026-07-15',null),
  -- 匿名で教会全体（author=aoi、一般会員には作者を隠す）
  ('e1000000-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e5',
   'prayer_request','published','anonymous_church','{"ja":"信仰が弱っているとき"}','{"ja":"また主に近づけるように祈ってください。"}',
   null,null,null,null,null,'anonymous_church',true,false,'{faith_struggle}','open','2026-06-25T21:00:00+09:00','2026-07-15',null),
  -- 祈祷チームのみ
  ('e1000000-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e2',
   'prayer_request','published','prayer_team','{"ja":"ある家庭のために"}','{"ja":"和解と平安のために、祈祷チームだけで覚えてください。"}',
   null,null,null,null,null,'prayer_team',false,false,'{}','open','2026-06-25T21:00:00+09:00',null,null),
  -- 牧師のみ
  ('e1000000-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e7',
   'prayer_request','published','pastor_only','{"ja":"牧師にだけ相談したいこと"}','{"ja":"経済的なことで個別に相談させてください。"}',
   null,null,null,null,null,'pastor_only',false,false,'{finances}','open','2026-06-25T21:00:00+09:00',null,null),
  -- 小グループのみ（青年会）
  ('e1000000-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-0000000000e5',
   'prayer_request','published','group','{"ja":"大学の試験と進路"}','{"ja":"青年会のみんなに。試験と進路のことを覚えて祈ってください。"}',
   null,null,null,null,null,'group',false,false,'{}','open','2026-06-25T21:00:00+09:00',null,null),
  -- 却下（rejected）
  ('e1000000-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e7',
   'prayer_request','rejected','church','{"ja":"却下された投稿"}','{"ja":"本人以外の私的事情を同意なく含んでいたため却下。"}',
   null,null,null,null,null,'church',false,false,'{third_party_information}','open',null,null,null),
  -- 期限切れ（published だが expires_at 過去）
  ('e1000000-0000-0000-0000-000000000017','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e7',
   'prayer_request','published','church','{"ja":"先週の集会のために（期限切れ）"}','{"ja":"期限切れのため会員一覧からは消えます。"}',
   null,null,null,null,null,'church',false,false,'{}','open','2026-06-24T06:30:00+09:00','2026-06-28',null),
  -- 応答（reflection）
  ('e1000000-0000-0000-0000-000000000020','11111111-1111-1111-1111-111111111111',null,'c1000000-0000-0000-0000-0000000000e5',
   'reflection','published','church','{"ja":"今日の応答"}','{"ja":"「まず目を上げる」という一言が心に残りました。"}',
   null,null,null,null,null,'church',false,false,'{}',null,'2026-07-01T08:10:00+09:00',null,null);

-- ── content_items（Grace：英語＋スペイン語。前々日のデボーション）───────
insert into public.content_items
  (id, church_id, author_membership_id, type, status, visibility, title, body,
   scripture_reference, scripture_translation, scripture_quote, reflection_question, prayer_guide,
   requested_visibility, published_at, devotion_date)
values
  ('e2000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','c2000000-0000-0000-0000-0000000000d1',
   'devotion','published','church',
   '{"en":"Do Not Be Afraid","es":"No temas"}',
   '{"en":"Fear tells us we are alone. God says: I am with you.","es":"El miedo nos dice que estamos solos. Dios dice: Yo estoy contigo."}',
   'Isaiah 41:10','NIV / RVR1960',
   '{"en":"So do not fear, for I am with you.","es":"No temas, porque yo estoy contigo."}',
   null,null,null,'2026-06-29T07:00:00-07:00','2026-06-29'),
  ('e2000000-0000-0000-0000-000000000011','22222222-2222-2222-2222-222222222222','c2000000-0000-0000-0000-0000000000d3',
   'prayer_request','published','church','{"en":"New job, new city"}','{"en":"Please pray for a smooth transition."}',
   null,null,null,null,null,'church','2026-06-25T21:00:00-07:00',null),
  ('e2000000-0000-0000-0000-000000000012','22222222-2222-2222-2222-222222222222','c2000000-0000-0000-0000-0000000000d2',
   'prayer_request','pending_review','prayer_team','{"en":"A friend''s health"}','{"en":"Praying for a friend facing a difficult diagnosis."}',
   null,null,null,null,null,'church',null,null);

-- ── moderation_reviews / reactions / completion_logs / notifications ───
insert into public.moderation_reviews (content_item_id, church_id, reviewer_membership_id, decision, note) values
  ('e1000000-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111','c1000000-0000-0000-0000-0000000000e1','rejected','本人以外の私的事情を同意なく含むため。'),
  ('e1000000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','c1000000-0000-0000-0000-0000000000e3','approved','確認のうえ教会全体で共有。');

insert into public.reactions (church_id, content_item_id, membership_id, type) values
  ('11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-0000000000e5','read'),
  ('11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-0000000000e2','read'),
  ('11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-0000000000e5','prayed'),
  ('11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000011','c1000000-0000-0000-0000-0000000000e2','prayed');

insert into public.completion_logs (church_id, content_item_id, membership_id, completed_read_at, completed_prayed_at) values
  ('11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-0000000000e5','2026-07-01T08:10:00+09:00','2026-07-01T08:10:00+09:00'),
  ('11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-0000000000e7','2026-07-01T08:20:00+09:00',null);

insert into public.notifications (church_id, recipient_membership_id, type, channel, title, status, read) values
  ('11111111-1111-1111-1111-111111111111','c1000000-0000-0000-0000-0000000000e5','daily_devotion_published','in_app','{"ja":"今日のみことばが届きました"}','sent',false),
  ('11111111-1111-1111-1111-111111111111','c1000000-0000-0000-0000-0000000000e4','daily_devotion_published','web_push','{"ja":"今日のみことばが届きました"}','failed',false);

insert into public.audit_logs (church_id, actor_membership_id, action, target_type, target_id) values
  ('11111111-1111-1111-1111-111111111111','c1000000-0000-0000-0000-0000000000e1','moderation.rejected','content_item','e1000000-0000-0000-0000-000000000016');
