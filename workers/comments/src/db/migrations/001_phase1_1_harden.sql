-- ============================================================
-- Migration 001 — Phase 1.1 Hardening
-- ============================================================
-- Apply to an existing Phase 1 database:
--   npm run db:migrate
--
-- Safe to run more than once (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- are handled by the error-ignoring wrangler d1 execute behaviour).
-- ============================================================

-- ── New columns on comments ────────────────────────────────────────────────────
ALTER TABLE comments ADD COLUMN is_locked     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN is_edited     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN shadow_hidden INTEGER NOT NULL DEFAULT 0;

-- ── New column on rate_log ─────────────────────────────────────────────────────
ALTER TABLE rate_log ADD COLUMN fingerprint_hash TEXT;

-- ── New tables ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_revisions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id  INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  body        TEXT    NOT NULL,
  edited_by   TEXT    NOT NULL DEFAULT 'user'
                      CHECK(edited_by IN ('user', 'moderator')),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS mod_audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  moderator     TEXT    NOT NULL DEFAULT 'system',
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
  comment_id    INTEGER REFERENCES comments(id) ON DELETE SET NULL,
  review_slug   TEXT,
  prev_status   TEXT,
  new_status    TEXT,
  reason        TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS votes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id  INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  ip_hash     TEXT    NOT NULL,
  value       INTEGER NOT NULL CHECK(value IN (1, -1)),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(comment_id, ip_hash)
);

-- ── New indexes ────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_comments_slug_status;
CREATE INDEX IF NOT EXISTS idx_comments_slug_status
  ON comments(review_slug, status, is_deleted, shadow_hidden, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_log_fingerprint
  ON rate_log(fingerprint_hash, action, created_at DESC)
  WHERE fingerprint_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_comment
  ON mod_audit_log(comment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_moderator
  ON mod_audit_log(moderator, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revisions_comment
  ON comment_revisions(comment_id, created_at ASC);
