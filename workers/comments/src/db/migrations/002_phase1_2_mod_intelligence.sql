-- ============================================================
-- Migration 002 — Phase 1.2 Moderator Intelligence
-- ============================================================
-- Apply to an existing Phase 1.1 database:
--   npm run db:migrate:1.2
--
-- Requires migration 001 to have been applied first.
-- Safe on a fresh Phase 1.1 install with no comment data.
-- ============================================================

-- ── Expand mod_audit_log action CHECK ─────────────────────────────────────────
-- SQLite cannot ALTER TABLE to change CHECK constraints.
-- Rebuild with the expanded set: add_note, edit_note, delete_note.
CREATE TABLE mod_audit_log_v2 (
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
                          'auto_reject',
                          'add_note', 'edit_note', 'delete_note'
                        )),
  comment_id    INTEGER REFERENCES comments(id) ON DELETE SET NULL,
  review_slug   TEXT,
  prev_status   TEXT,
  new_status    TEXT,
  reason        TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT INTO mod_audit_log_v2
  SELECT id, moderator, action, comment_id, review_slug, prev_status, new_status, reason, created_at
  FROM mod_audit_log;

DROP TABLE mod_audit_log;
ALTER TABLE mod_audit_log_v2 RENAME TO mod_audit_log;

-- Recreate indexes that reference mod_audit_log
CREATE INDEX IF NOT EXISTS idx_audit_comment
  ON mod_audit_log(comment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_moderator
  ON mod_audit_log(moderator, created_at DESC);

-- ── New index: commenter history lookup ────────────────────────────────────────
-- Required for getCommenterStats and getCommenterHistory queries.
CREATE INDEX IF NOT EXISTS idx_comments_ip_hash
  ON comments(ip_hash, created_at DESC);

-- ── New tables ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commenter_profiles (
  ip_hash    TEXT PRIMARY KEY,
  is_banned  INTEGER NOT NULL DEFAULT 0 CHECK(is_banned IN (0, 1)),
  ban_reason TEXT,
  banned_at  TEXT,
  banned_by  TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS commenter_fingerprints (
  ip_hash          TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  first_seen_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_seen_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (ip_hash, fingerprint_hash)
);

CREATE TABLE IF NOT EXISTS mod_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash    TEXT    NOT NULL,
  moderator  TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  category   TEXT    NOT NULL DEFAULT 'general'
                     CHECK(category IN ('spam', 'spoilers', 'abuse', 'general')),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Indexes for new tables ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fp_ip
  ON commenter_fingerprints(ip_hash);

CREATE INDEX IF NOT EXISTS idx_fp_fingerprint
  ON commenter_fingerprints(fingerprint_hash);

CREATE INDEX IF NOT EXISTS idx_mod_notes_ip
  ON mod_notes(ip_hash, created_at DESC);
