-- ============================================================
-- WretVision Comments — D1 Schema (Phase 1.1 — Hardened)
-- ============================================================
-- Fresh install:  npm run db:init
-- Live migration: npm run db:migrate
-- ============================================================

-- ── Comments ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  -- Identity
  id            INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Which review this comment belongs to (matches reviews.js slug field)
  review_slug   TEXT    NOT NULL,

  -- NULL = top-level comment. Set to parent comment's id for replies.
  -- Replies are one level deep only (enforced at API layer). Schema supports deeper nesting.
  parent_id     INTEGER REFERENCES comments(id) ON DELETE SET NULL,

  -- The name the commenter chose to display. NOT an account — just a label.
  -- Reserved and impersonation-attempt names are blocked at the API layer.
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

  -- Commenter self-declares a spoiler. Frontend uses click-to-reveal (Phase 2).
  is_spoiler    INTEGER NOT NULL DEFAULT 0 CHECK(is_spoiler IN (0, 1)),

  -- Soft delete. Comment body replaced with '[deleted]' on frontend.
  -- Row is never removed so reply threads remain intact.
  is_deleted    INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),

  -- Moderator lock: no new replies can be posted to this comment.
  is_locked     INTEGER NOT NULL DEFAULT 0 CHECK(is_locked IN (0, 1)),

  -- Whether the comment body has been edited at least once.
  -- Revision history is kept in comment_revisions. Public UI shows "Edited" label only.
  is_edited     INTEGER NOT NULL DEFAULT 0 CHECK(is_edited IN (0, 1)),

  -- Shadow moderation: when 1, comment is excluded from public responses.
  -- Phase 2 will make it visible ONLY to the commenter (IP hash match in GET).
  -- Lets moderators silently suppress spam without triggering avoidance behaviour.
  shadow_hidden INTEGER NOT NULL DEFAULT 0 CHECK(shadow_hidden IN (0, 1)),

  -- Running count of user reports. Threshold triggers auto-hide (API layer).
  report_count  INTEGER NOT NULL DEFAULT 0,

  -- SHA-256(salt:ip). Never stored raw. Used for rate limiting and shadow matching.
  ip_hash       TEXT    NOT NULL,

  -- Timestamps stored as ISO-8601 UTC strings (SQLite has no native DATETIME type).
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Comment Revision History ──────────────────────────────────────────────────
-- Every version of a comment body is stored here.
-- When a comment is first created, its original body is inserted as revision 1.
-- Each subsequent edit appends a new row; the comments.body column is updated.
-- Public users see only the "Edited" label on comments.is_edited = 1.
-- Moderators can view full revision history via the moderation dashboard (Phase 3).
CREATE TABLE IF NOT EXISTS comment_revisions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id  INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,

  -- The body text as it was at this revision.
  body        TEXT    NOT NULL,

  -- Who made this revision: 'user' for commenter edits, 'moderator' for mod edits.
  edited_by   TEXT    NOT NULL DEFAULT 'user'
                      CHECK(edited_by IN ('user', 'moderator')),

  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
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

-- ── Moderator Audit Log ───────────────────────────────────────────────────────
-- Every moderator action is recorded here permanently.
-- This table is NEVER exposed via any public API endpoint.
-- Used for accountability, rollback decisions, and future ban review.
CREATE TABLE IF NOT EXISTS mod_audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Who performed the action. 'system' for automated actions (e.g. auto-reject).
  moderator     TEXT    NOT NULL DEFAULT 'system',

  -- The action taken.
  action        TEXT    NOT NULL
                        CHECK(action IN (
                          'approve', 'reject', 'hide', 'restore',
                          'delete', 'pin', 'unpin',
                          'lock', 'unlock',
                          'spoiler', 'unspoiler',
                          'shadow_hide', 'shadow_restore',
                          'ban', 'unban',
                          'auto_reject'
                        )),

  -- The comment this action was applied to. NULL for account-level actions (ban/unban).
  comment_id    INTEGER REFERENCES comments(id) ON DELETE SET NULL,

  -- Copied at log time so the record survives comment deletion.
  review_slug   TEXT,

  -- Status before and after the action. NULL if action is not a status change.
  prev_status   TEXT,
  new_status    TEXT,

  -- Optional free-text reason supplied by the moderator.
  reason        TEXT,

  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Rate Limit Log ────────────────────────────────────────────────────────────
-- Lightweight log used to enforce flood protection per IP hash + fingerprint.
-- Rows older than the window are ignored by the API; purged on each write.
--
-- What is stored:
--   ip_hash          — SHA-256(salt:ip). Never raw IP.
--   fingerprint_hash — SHA-256(ip|user-agent|accept-language|client-hints).
--                      Non-reversible. Used to rate-limit across IP changes.
--                      NULL when request metadata is unavailable.
-- What is NOT stored: raw IP, raw User-Agent, any personally identifiable data.
CREATE TABLE IF NOT EXISTS rate_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash          TEXT    NOT NULL,
  fingerprint_hash TEXT,
  action           TEXT    NOT NULL DEFAULT 'post' CHECK(action IN ('post', 'report')),
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Vote Architecture (Phase 4 — Schema Only) ─────────────────────────────────
-- No API endpoints are exposed for votes in Phase 1.
-- This table is here so future voting can be added without a schema overhaul.
--
-- Intended behaviour (Phase 4):
--   value =  1 → upvote
--   value = -1 → downvote (may be disabled — TBD)
--   One vote per IP per comment, changeable.
--   vote_count is a derived value: COUNT(value=1) - COUNT(value=-1)
--   It will NOT be stored on the comment row to avoid update contention.
CREATE TABLE IF NOT EXISTS votes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id  INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  ip_hash     TEXT    NOT NULL,
  value       INTEGER NOT NULL CHECK(value IN (1, -1)),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

  -- One vote record per IP per comment (update in place to change vote).
  UNIQUE(comment_id, ip_hash)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary read path: fetch approved, non-deleted, non-shadow-hidden comments for a slug.
CREATE INDEX IF NOT EXISTS idx_comments_slug_status
  ON comments(review_slug, status, is_deleted, shadow_hidden, created_at DESC);

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

-- Rate limit lookups by fingerprint (catches IP rotation).
CREATE INDEX IF NOT EXISTS idx_rate_log_fingerprint
  ON rate_log(fingerprint_hash, action, created_at DESC)
  WHERE fingerprint_hash IS NOT NULL;

-- Report deduplication.
CREATE INDEX IF NOT EXISTS idx_reports_comment
  ON reports(comment_id);

-- Audit log — most recent actions per comment for moderation UI.
CREATE INDEX IF NOT EXISTS idx_audit_comment
  ON mod_audit_log(comment_id, created_at DESC);

-- Audit log — chronological moderator history.
CREATE INDEX IF NOT EXISTS idx_audit_moderator
  ON mod_audit_log(moderator, created_at DESC);

-- Revision history — all revisions for a comment, oldest first.
CREATE INDEX IF NOT EXISTS idx_revisions_comment
  ON comment_revisions(comment_id, created_at ASC);
