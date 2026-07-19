// ============================================================
// D1 Query Functions
// ============================================================
// All SQL lives here. No raw SQL in API handlers.
// ============================================================

import { STATUS, AUTO_HIDE } from '../config/constants.js';

// ── GET ───────────────────────────────────────────────────────────────────────

// Fetch paginated approved top-level comments for a review slug.
// Pinned comments are sorted first, then by created_at DESC.
export async function getComments(db, slug, limit, offset) {
  const { results } = await db
    .prepare(`
      SELECT
        id, review_slug, parent_id, display_name, body,
        is_pinned, is_spoiler, is_deleted, report_count, created_at
      FROM   comments
      WHERE  review_slug = ?
      AND    status      = '${STATUS.APPROVED}'
      AND    parent_id   IS NULL
      ORDER  BY is_pinned DESC, created_at DESC
      LIMIT  ? OFFSET ?
    `)
    .bind(slug, limit, offset)
    .all();

  return results;
}

// Fetch approved replies for a given parent comment id.
export async function getReplies(db, parentId) {
  const { results } = await db
    .prepare(`
      SELECT
        id, review_slug, parent_id, display_name, body,
        is_pinned, is_spoiler, is_deleted, report_count, created_at
      FROM   comments
      WHERE  parent_id = ?
      AND    status    = '${STATUS.APPROVED}'
      ORDER  BY created_at ASC
    `)
    .bind(parentId)
    .all();

  return results;
}

// Total approved comment count for a slug (used for pagination metadata).
export async function getCommentCount(db, slug) {
  const { results } = await db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM   comments
      WHERE  review_slug = ?
      AND    status      = '${STATUS.APPROVED}'
      AND    parent_id   IS NULL
    `)
    .bind(slug)
    .all();

  return results[0]?.total ?? 0;
}

// ── INSERT ────────────────────────────────────────────────────────────────────

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
        (review_slug, parent_id, display_name, body, is_spoiler, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?)
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

  return result.meta?.last_row_id;
}

// ── REPORT ────────────────────────────────────────────────────────────────────

// Insert a report. Returns false if this IP already reported this comment.
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

  // Increment report_count on the comment
  await db
    .prepare(`UPDATE comments SET report_count = report_count + 1 WHERE id = ?`)
    .bind(commentId)
    .run();

  // Auto-reject if threshold crossed
  await db
    .prepare(`
      UPDATE comments
      SET    status = '${STATUS.REJECTED}'
      WHERE  id     = ?
      AND    report_count >= ${AUTO_HIDE.REPORT_THRESHOLD}
    `)
    .bind(commentId)
    .run();

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
