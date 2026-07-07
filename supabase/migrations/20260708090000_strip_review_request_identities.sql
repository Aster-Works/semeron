-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ strip_review_request_identities                                       ║
-- ║ content_items.metadata は content_feed 経由で全閲覧会員に見える。      ║
-- ║ 旧 requestAdminReview が書いた「誰が確認を依頼したか」                 ║
-- ║ (admin_review_requested_by / admin_review_requests[{by}]) は、         ║
-- ║ 依頼者の身元が投稿者に漏れる = 通報者保護に反するため既存行から剥がす。 ║
-- ║ 以後の記録は audit_logs（管理者のみ閲覧可）だけが身元を持つ。          ║
-- ╚══════════════════════════════════════════════════════════════════════╝

update public.content_items
set metadata = metadata - 'admin_review_requested_by' - 'admin_review_requests' - 'admin_review_resolved_by'
where type = 'prayer_request'
  and (
    metadata ? 'admin_review_requested_by'
    or metadata ? 'admin_review_requests'
    or metadata ? 'admin_review_resolved_by'
  );
