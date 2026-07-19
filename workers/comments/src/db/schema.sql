-- ============================================================
-- WretVision Comments — D1 Schema (Phase 1.2 — Moderator Intelligence)
-- ============================================================
-- Fresh install:  npm run db:init
-- Upgrade Phase 1.1 DB: npm run db:migrate:1.2
-- ============================================================

-- ── Comments ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  review_slug   TEXT    NOT NULL,
  parent_id     INTEGER REFERENCES comments(id) ON DELETE SET NULL,
  display_name  TEXT    NOT NULL,
  body          TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending', 'approved', 'rejected')),
  is_pinned     INTEGER NOT NULL DEFAULT 0 CHECK(is_pinned IN (0, 1)),
  is_spoiler    INTEGER NOT NULL DEFAULT 0 CHECK(is_spoiler IN (0, 1)),
  is_deleted    INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),
  is_locked     INTEGER NOT NULL DEFAULT 0 CHECK(is_locked IN (0, 1)),
  is_edited     INTEGER NOT NULL DEFAULT 0 CHECK(is_edited IN (0, 1)),
  shadow_hidden INTEGER NOT NULL DEFAULT 0 CHECK(shadow_hidden IN (0, 1)),
  report_count  INTEGER NOT NULL DEFAULT 0,
  ip_hash       TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Comment Revision History ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_revisions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id  INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  body        TEXT    NOT NULL,
  edited_by   TEXT    NOT NULL DEFAULT 'user'
                      CHECK(edited_by IN ('user', 'moderator')),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Reports ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id    INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  ip_hash       TEXT    NOT NULL,
  reason        TEXT    NOT NULL DEFAULT 'inappropriate'
                        CHECK(reason IN ('spam', 'harassment', 'spoiler', 'inappropriate', 'other')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(comment_id, ip_hash)
);

-- ── Moderator Audit Log ───────────────────────────────────────────────────────
-- Every moderator action (manual or automated). NEVER exposed publicly.
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

-- ── Rate Limit Log ────────────────────────────────────────────────────────────
-- Stores only hashes. Raw IP/UA never persisted. See fingerprint.js.
CREATE TABLE IF NOT EXISTS rate_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash          TEXT    NOT NULL,
  fingerprint_hash TEXT,
  action           TEXT    NOT NULL DEFAULT 'post' CHECK(action IN ('post', 'report')),
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Vote Architecture (Phase 4 — schema only, no endpoints) ──────────────────
CREATE TABLE IF NOT EXISTS votes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id  INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  ip_hash     TEXT    NOT NULL,
  value       INTEGER NOT NULL CHECK(value IN (1, -1)),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(comment_id, ip_hash)
);

-- ── Commenter Profiles ────────────────────────────────────────────────────────
-- Internal identity record keyed by ip_hash.
-- Only stores data that CANNOT be derived from the comments table:
--   ban status, ban metadata, and timestamps for first/last activity.
-- Stats (comment counts, report totals) are computed live from comments.
-- Created lazily — only when a commenter is banned or gets a mod note.
-- NOT exposed publicly under any circumstances.
CREATE TABLE IF NOT EXISTS commenter_profiles (
  ip_hash    TEXT PRIMARY KEY,

  -- Ban state
  is_banned  INTEGER NOT NULL DEFAULT 0 CHECK(is_banned IN (0, 1)),
  ban_reason TEXT,
  banned_at  TEXT,
  banned_by  TEXT,   -- moderator username who issued the ban

  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Commenter Fingerprints ────────────────────────────────────────────────────
-- Maps ip_hash → fingerprint_hash associations over time.
-- Allows detection of ban evasion (same device, different IP).
-- Allows cross-linking (same IP, multiple devices).
-- Only hashes stored — no raw IPs, no raw User-Agents.
-- NOT exposed publicly.
CREATE TABLE IF NOT EXISTS commenter_fingerprints (
  ip_hash          TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  first_seen_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_seen_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

  PRIMARY KEY (ip_hash, fingerprint_hash)
);

-- ── Moderator Notes ───────────────────────────────────────────────────────────
-- Internal notes attached to a commenter (ip_hash).
-- Never overwritten — each edit creates no log here (see mod_audit_log).
-- Multiple notes allowed per commenter.
-- NOT exposed publicly under any circumstances.
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

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary read path: approved, non-deleted, non-shadow-hidden comments for a slug.
CREATE INDEX IF NOT EXISTS idx_comments_slug_status
  ON comments(review_slug, status, is_deleted, shadow_hidden, created_at DESC);

-- Moderation: all comments by a specific commenter (history + profile stats).
CREATE INDEX IF NOT EXISTS idx_comments_ip_hash
  ON comments(ip_hash, created_at DESC);

-- Reply fetching.
CREATE INDEX IF NOT EXISTS idx_comments_parent
  ON comments(parent_id);

-- Moderation queue.
CREATE INDEX IF NOT EXISTS idx_comments_pending
  ON comments(status, created_at)
  WHERE status = 'pending';

-- Pinned comment bubble-up.
CREATE INDEX IF NOT EXISTS idx_comments_pinned
  ON comments(review_slug, is_pinned)
  WHERE is_pinned = 1;

-- Rate limit: per-IP lookup.
CREATE INDEX IF NOT EXISTS idx_rate_log_ip
  ON rate_log(ip_hash, action, created_at DESC);

-- Rate limit: per-fingerprint lookup (catches IP rotation).
CREATE INDEX IF NOT EXISTS idx_rate_log_fingerprint
  ON rate_log(fingerprint_hash, action, created_at DESC)
  WHERE fingerprint_hash IS NOT NULL;

-- Report deduplication.
CREATE INDEX IF NOT EXISTS idx_reports_comment
  ON reports(comment_id);

-- Audit log: by comment (for per-comment mod history in dashboard).
CREATE INDEX IF NOT EXISTS idx_audit_comment
  ON mod_audit_log(comment_id, created_at DESC);

-- Audit log: by moderator (for moderator accountability view).
CREATE INDEX IF NOT EXISTS idx_audit_moderator
  ON mod_audit_log(moderator, created_at DESC);

-- Revision history: all revisions for a comment, oldest first.
CREATE INDEX IF NOT EXISTS idx_revisions_comment
  ON comment_revisions(comment_id, created_at ASC);

-- Commenter fingerprints: lookup all fingerprints for an ip_hash.
CREATE INDEX IF NOT EXISTS idx_fp_ip
  ON commenter_fingerprints(ip_hash);

-- Commenter fingerprints: reverse lookup — find ip_hashes sharing a fingerprint.
-- Used to detect ban evasion (same device, new IP).
CREATE INDEX IF NOT EXISTS idx_fp_fingerprint
  ON commenter_fingerprints(fingerprint_hash);

-- Mod notes: all notes for a commenter, newest first.
CREATE INDEX IF NOT EXISTS idx_mod_notes_ip
  ON mod_notes(ip_hash, created_at DESC);
