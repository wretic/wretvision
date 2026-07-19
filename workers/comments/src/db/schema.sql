-- ============================================================
-- WretVision Comments — D1 Schema
-- ============================================================
-- Run via: wrangler d1 execute wretvision-comments --file=src/db/schema.sql
-- ============================================================

-- ── Comments ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  -- Identity
  id            INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Which review this comment belongs to (matches reviews.js slug field)
  review_slug   TEXT    NOT NULL,

  -- NULL = top-level comment. Set to parent comment's id for replies.
  -- Replies are one level deep only in Phase 1. Schema supports deeper nesting for future.
  parent_id     INTEGER REFERENCES comments(id) ON DELETE SET NULL,

  -- The name the commenter chose to display. NOT an account — just a label.
  -- Reserved names are blocked at the API layer before reaching the DB.
  display_name  TEXT    NOT NULL,

  -- The comment body. Sanitized and stripped of HTML before storage.
  body          TEXT    NOT NULL,

  -- Moderation status.
  -- 'pending'  — awaiting approval (default for all new comments)
  -- 'approved' — visible on the site
  -- 'rejected' — hidden, kept for audit trail
  status        TEXT    NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending', 'approved', 'rejected')),

  -- Owner/moderator can pin a comment to the top of the thread.
  is_pinned     INTEGER NOT NULL DEFAULT 0 CHECK(is_pinned IN (0, 1)),

  -- Commenter self-declares a spoiler. Frontend will blur the body.
  is_spoiler    INTEGER NOT NULL DEFAULT 0 CHECK(is_spoiler IN (0, 1)),

  -- Soft delete. Comment body replaced with '[deleted]' on frontend.
  -- Row is never removed so reply threads remain intact.
  is_deleted    INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),

  -- Running count of user reports. Threshold triggers auto-hide (API layer).
  report_count  INTEGER NOT NULL DEFAULT 0,

  -- SHA-256 hash of the commenter's IP. Never stored raw.
  -- Used for rate limiting and spam detection only.
  ip_hash       TEXT    NOT NULL,

  -- Timestamps stored as ISO-8601 UTC strings (SQLite has no native DATETIME type).
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Reports ───────────────────────────────────────────────────────────────────
-- Separate table so duplicate reports from the same IP are preventable.
CREATE TABLE IF NOT EXISTS reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id    INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  ip_hash       TEXT    NOT NULL,
  reason        TEXT    NOT NULL DEFAULT 'inappropriate'
                        CHECK(reason IN ('spam', 'harassment', 'spoiler', 'inappropriate', 'other')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

  -- One report per IP per comment.
  UNIQUE(comment_id, ip_hash)
);

-- ── Rate Limit Log ────────────────────────────────────────────────────────────
-- Lightweight log used to enforce flood protection per IP hash.
-- Rows older than the window are ignored by the API; purged periodically.
CREATE TABLE IF NOT EXISTS rate_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash       TEXT    NOT NULL,
  action        TEXT    NOT NULL DEFAULT 'post' CHECK(action IN ('post', 'report')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary read path: fetch approved, non-deleted comments for a slug, newest first.
CREATE INDEX IF NOT EXISTS idx_comments_slug_status
  ON comments(review_slug, status, is_deleted, created_at DESC);

-- Fetch replies for a parent comment.
CREATE INDEX IF NOT EXISTS idx_comments_parent
  ON comments(parent_id);

-- Moderation queue: all pending comments, oldest first.
CREATE INDEX IF NOT EXISTS idx_comments_pending
  ON comments(status, created_at)
  WHERE status = 'pending';

-- Pinned comments bubble to top.
CREATE INDEX IF NOT EXISTS idx_comments_pinned
  ON comments(review_slug, is_pinned)
  WHERE is_pinned = 1;

-- Rate limit lookups by IP.
CREATE INDEX IF NOT EXISTS idx_rate_log_ip
  ON rate_log(ip_hash, action, created_at DESC);

-- Report deduplication.
CREATE INDEX IF NOT EXISTS idx_reports_comment
  ON reports(comment_id);
