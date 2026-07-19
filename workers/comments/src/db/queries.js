// ============================================================
// D1 Query Functions
// ============================================================
// All SQL lives here. No raw SQL in API handlers.
// ============================================================

import { STATUS, AUTO_HIDE, MOD_ACTIONS } from '../config/constants.js';
import { logModAction } from './audit.js';

// ── GET ───────────────────────────────────────────────────────────────────────

// Fetch paginated approved top-level comments for a review slug.
// Pinned comments sorted first, then newest first.
// shadow_hidden comments are excluded from public responses.
// Phase 2 will pass requesterIpHash to make shadow-hidden visible to their author.
export async function getComments(db, slug, limit, offset) {
  const { results } = await db
    .prepare(`
      SELECT
        id, review_slug, parent_id, display_name, body,
        is_pinned, is_spoiler, is_deleted, is_edited, is_locked, created_at
      FROM   comments
      WHERE  review_slug   = ?
      AND    status        = '${STATUS.APPROVED}'
      AND    parent_id     IS NULL
      AND    shadow_hidden = 0
      AND    is_deleted    = 0
      ORDER  BY is_pinned DESC, created_at DESC
      LIMIT  ? OFFSET ?
    `)
    .bind(slug, limit, offset)
    .all();

  return results;
}

// Fetch approved replies for a given parent comment.
// Replies on locked parents are still shown (lock only blocks NEW replies).
export async function getReplies(db, parentId) {
  const { results } = await db
    .prepare(`
      SELECT
        id, review_slug, parent_id, display_name, body,
        is_pinned, is_spoiler, is_deleted, is_edited, created_at
      FROM   comments
      WHERE  parent_id    = ?
      AND    status       = '${STATUS.APPROVED}'
      AND    shadow_hidden = 0
      AND    is_deleted    = 0
      ORDER  BY created_at ASC
    `)
    .bind(parentId)
    .all();

  return results;
}

// Total approved, non-shadow-hidden top-level comment count for pagination.
export async function getCommentCount(db, slug) {
  const { results } = await db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM   comments
      WHERE  review_slug   = ?
      AND    status        = '${STATUS.APPROVED}'
      AND    parent_id     IS NULL
      AND    shadow_hidden = 0
      AND    is_deleted    = 0
    `)
    .bind(slug)
    .all();

  return results[0]?.total ?? 0;
}

// ── INSERT ────────────────────────────────────────────────────────────────────

// Insert a new comment AND record its original body as revision 1.
export async function insertComment(db, {
  review_slug,
  parent_id,
  display_name,
  body,
  is_spoiler,
  ip_hash,
}) {
  const result = await db
    .prepare(`
      INSERT INTO comments
        (review_slug, parent_id, display_name, body, is_spoiler, ip_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, 'approved')
    `)
    .bind(
      review_slug,
      parent_id ?? null,
      display_name,
      body,
      is_spoiler ? 1 : 0,
      ip_hash,
    )
    .run();

  const id = result.meta?.last_row_id;

  // Record the original body as revision 1 so edit history is always complete.
  await insertRevision(db, id, body, 'user');

  return id;
}

// ── REVISION HISTORY ──────────────────────────────────────────────────────────

// Append a new revision. Called on initial insert and on every subsequent edit.
export async function insertRevision(db, commentId, body, editedBy = 'user') {
  await db
    .prepare(`
      INSERT INTO comment_revisions (comment_id, body, edited_by)
      VALUES (?, ?, ?)
    `)
    .bind(commentId, body, editedBy)
    .run();
}

// Fetch all revisions for a comment. Moderator-only; not exposed publicly.
export async function getRevisions(db, commentId) {
  const { results } = await db
    .prepare(`
      SELECT id, body, edited_by, created_at
      FROM   comment_revisions
      WHERE  comment_id = ?
      ORDER  BY created_at ASC
    `)
    .bind(commentId)
    .all();

  return results;
}

// ── REPORT ────────────────────────────────────────────────────────────────────

// Insert a report. Returns false if this IP already reported this comment.
// Auto-rejects the comment if the report threshold is crossed and logs the action.
export async function insertReport(db, commentId, ipHash, reason) {
  try {
    await db
      .prepare(`INSERT INTO reports (comment_id, ip_hash, reason) VALUES (?, ?, ?)`)
      .bind(commentId, ipHash, reason)
      .run();
  } catch (e) {
    // UNIQUE constraint violation — duplicate report from this IP
    if (e.message?.includes('UNIQUE')) return false;
    throw e;
  }

  // Increment report_count
  await db
    .prepare(`UPDATE comments SET report_count = report_count + 1 WHERE id = ?`)
    .bind(commentId)
    .run();

  // Auto-reject if threshold crossed
  const { results } = await db
    .prepare(`
      SELECT status, review_slug
      FROM   comments
      WHERE  id           = ?
      AND    report_count >= ${AUTO_HIDE.REPORT_THRESHOLD}
      AND    status      != '${STATUS.REJECTED}'
    `)
    .bind(commentId)
    .all();

  if (results.length > 0) {
    const { status: prevStatus, review_slug } = results[0];

    await db
      .prepare(`UPDATE comments SET status = '${STATUS.REJECTED}' WHERE id = ?`)
      .bind(commentId)
      .run();

    await logModAction(db, {
      moderator:  'system',
      action:     MOD_ACTIONS.AUTO_REJECT,
      commentId,
      reviewSlug: review_slug,
      prevStatus,
      newStatus:  STATUS.REJECTED,
      reason:     `Report threshold exceeded (${AUTO_HIDE.REPORT_THRESHOLD} reports)`,
    });
  }

  return true;
}

// ── FETCH SINGLE ──────────────────────────────────────────────────────────────

export async function getCommentById(db, id) {
  const { results } = await db
    .prepare(`SELECT * FROM comments WHERE id = ?`)
    .bind(id)
    .all();

  return results[0] ?? null;
}
