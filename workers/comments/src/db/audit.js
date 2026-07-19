// ============================================================
// Moderator Audit Log
// ============================================================
// Every moderator action (manual or automated) is recorded here.
// This table is NEVER exposed via any public API endpoint.
//
// Usage:
//   import { logModAction } from '../db/audit.js';
//
//   await logModAction(env.DB, {
//     moderator:  'system',           // or owner username in Phase 3
//     action:     MOD_ACTIONS.AUTO_REJECT,
//     commentId:  42,
//     reviewSlug: 'evil-dead-burn-review',
//     prevStatus: 'approved',
//     newStatus:  'rejected',
//     reason:     'Report threshold exceeded (5 reports)',
//   });
// ============================================================

export async function logModAction(db, {
  moderator  = 'system',
  action,
  commentId  = null,
  reviewSlug = null,
  prevStatus = null,
  newStatus  = null,
  reason     = null,
} = {}) {
  await db
    .prepare(`
      INSERT INTO mod_audit_log
        (moderator, action, comment_id, review_slug, prev_status, new_status, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(moderator, action, commentId, reviewSlug, prevStatus, newStatus, reason)
    .run();
}
