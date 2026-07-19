// ============================================================
// Moderator Query Functions
// ============================================================
// All SQL for the /api/mod/* endpoints lives here.
// None of these functions are reachable without mod auth.
//
// Performance design:
//   - getCommenterStats: single aggregation query (no N+1).
//   - getCommenterProfile + getCommenterStats + getNoteCount
//     + getFingerprintCount all run in parallel via Promise.all
//     in the API handler, not here.
//   - getCommenterHistory: single paginated query with indexed
//     lookup on (ip_hash, created_at DESC).
//   - All lookups use the idx_comments_ip_hash index.
// ============================================================

// ── Stats ─────────────────────────────────────────────────────────────────────

// Single aggregation query — returns all comment counts for a commenter.
// Expected performance: sub-millisecond with idx_comments_ip_hash on any
// dataset up to ~1M rows. At WretVision scale (<10k comments) this is instant.
export async function getCommenterStats(db, ipHash) {
  const { results } = await db
    .prepare(`
      SELECT
        COUNT(*)                                            AS total,
        SUM(CASE WHEN status      = 'approved'  THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status      = 'pending'   THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status      = 'rejected'  THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN is_deleted  = 1           THEN 1 ELSE 0 END) AS deleted,
        SUM(CASE WHEN shadow_hidden = 1         THEN 1 ELSE 0 END) AS shadow_hidden,
        SUM(report_count)                                   AS total_reports_received,
        MIN(created_at)                                     AS first_comment_at,
        MAX(created_at)                                     AS last_comment_at
      FROM comments
      WHERE ip_hash = ?
    `)
    .bind(ipHash)
    .all();

  const row = results[0];
  return {
    total:                  row?.total                  ?? 0,
    approved:               row?.approved               ?? 0,
    pending:                row?.pending                ?? 0,
    rejected:               row?.rejected               ?? 0,
    deleted:                row?.deleted                ?? 0,
    shadow_hidden:          row?.shadow_hidden          ?? 0,
    total_reports_received: row?.total_reports_received ?? 0,
    first_comment_at:       row?.first_comment_at       ?? null,
    last_comment_at:        row?.last_comment_at        ?? null,
  };
}

// ── Commenter Profiles ────────────────────────────────────────────────────────

export async function getCommenterProfile(db, ipHash) {
  const { results } = await db
    .prepare(`SELECT * FROM commenter_profiles WHERE ip_hash = ?`)
    .bind(ipHash)
    .all();
  return results[0] ?? null;
}

// Upsert the profile row (creates it on first ban; updates on subsequent bans).
export async function upsertBanState(db, ipHash, { isBanned, banReason, bannedBy }) {
  const now = new Date().toISOString();

  await db
    .prepare(`
      INSERT INTO commenter_profiles (ip_hash, is_banned, ban_reason, banned_at, banned_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(ip_hash) DO UPDATE SET
        is_banned  = excluded.is_banned,
        ban_reason = excluded.ban_reason,
        banned_at  = excluded.banned_at,
        banned_by  = excluded.banned_by,
        updated_at = excluded.updated_at
    `)
    .bind(
      ipHash,
      isBanned ? 1 : 0,
      banReason ?? null,
      isBanned ? now : null,
      isBanned ? bannedBy : null,
      now,
    )
    .run();
}

// ── Fingerprint Linking ───────────────────────────────────────────────────────

// Record or refresh an ip_hash ↔ fingerprint_hash association.
// Called on every successful comment submission so the link stays current.
export async function linkFingerprint(db, ipHash, fingerprintHash) {
  if (!fingerprintHash) return;
  const now = new Date().toISOString();

  await db
    .prepare(`
      INSERT INTO commenter_fingerprints (ip_hash, fingerprint_hash, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(ip_hash, fingerprint_hash) DO UPDATE SET
        last_seen_at = excluded.last_seen_at
    `)
    .bind(ipHash, fingerprintHash, now, now)
    .run();
}

// All fingerprints ever seen from an ip_hash.
export async function getFingerprints(db, ipHash) {
  const { results } = await db
    .prepare(`
      SELECT fingerprint_hash, first_seen_at, last_seen_at
      FROM   commenter_fingerprints
      WHERE  ip_hash = ?
      ORDER  BY last_seen_at DESC
    `)
    .bind(ipHash)
    .all();
  return results;
}

// Count of distinct fingerprints for an ip_hash (used in profile summary).
export async function getFingerprintCount(db, ipHash) {
  const { results } = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM commenter_fingerprints WHERE ip_hash = ?`)
    .bind(ipHash)
    .all();
  return results[0]?.cnt ?? 0;
}

// Reverse: find all ip_hashes that have ever shared a given fingerprint.
// Used to detect ban evasion (same device fingerprint, changed IP).
export async function getIpHashesByFingerprint(db, fingerprintHash) {
  const { results } = await db
    .prepare(`
      SELECT ip_hash, first_seen_at, last_seen_at
      FROM   commenter_fingerprints
      WHERE  fingerprint_hash = ?
      ORDER  BY last_seen_at DESC
    `)
    .bind(fingerprintHash)
    .all();
  return results;
}

// ── Commenter History ─────────────────────────────────────────────────────────

// All comments by a commenter across all statuses — for mod review.
// Includes internal fields (status, shadow_hidden, report_count) not sent publicly.
export async function getCommenterHistory(db, ipHash, limit = 20, offset = 0) {
  const { results } = await db
    .prepare(`
      SELECT
        id, review_slug, parent_id, display_name, body, status,
        is_pinned, is_spoiler, is_deleted, is_locked, is_edited,
        shadow_hidden, report_count, created_at
      FROM   comments
      WHERE  ip_hash = ?
      ORDER  BY created_at DESC
      LIMIT  ? OFFSET ?
    `)
    .bind(ipHash, limit, offset)
    .all();

  return results;
}

export async function getCommenterCommentCount(db, ipHash) {
  const { results } = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM comments WHERE ip_hash = ?`)
    .bind(ipHash)
    .all();
  return results[0]?.cnt ?? 0;
}

// ── Moderator Notes ───────────────────────────────────────────────────────────

export async function getNotes(db, ipHash) {
  const { results } = await db
    .prepare(`
      SELECT id, moderator, body, category, created_at, updated_at
      FROM   mod_notes
      WHERE  ip_hash = ?
      ORDER  BY created_at DESC
    `)
    .bind(ipHash)
    .all();
  return results;
}

export async function getNoteCount(db, ipHash) {
  const { results } = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM mod_notes WHERE ip_hash = ?`)
    .bind(ipHash)
    .all();
  return results[0]?.cnt ?? 0;
}

export async function getNoteById(db, id) {
  const { results } = await db
    .prepare(`SELECT * FROM mod_notes WHERE id = ?`)
    .bind(id)
    .all();
  return results[0] ?? null;
}

export async function insertNote(db, ipHash, moderator, body, category) {
  const result = await db
    .prepare(`
      INSERT INTO mod_notes (ip_hash, moderator, body, category)
      VALUES (?, ?, ?, ?)
    `)
    .bind(ipHash, moderator, body, category)
    .run();
  return result.meta?.last_row_id;
}

export async function updateNote(db, id, body, category) {
  const now = new Date().toISOString();
  await db
    .prepare(`
      UPDATE mod_notes
      SET    body = ?, category = ?, updated_at = ?
      WHERE  id   = ?
    `)
    .bind(body, category, now, id)
    .run();
}

export async function deleteNote(db, id) {
  await db
    .prepare(`DELETE FROM mod_notes WHERE id = ?`)
    .bind(id)
    .run();
}
