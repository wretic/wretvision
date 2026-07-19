// ============================================================
// Rate Limiting (D1-backed)
// ============================================================
// Checks post/report frequency per IP hash using the rate_log table.
// Older rows are ignored; a cleanup query runs on each check to
// prevent the table growing unbounded.
// ============================================================

import { RATE_LIMIT } from '../config/constants.js';

// Returns true if the IP is over the limit for the given action.
export async function isRateLimited(db, ipHash, action = 'post') {
  const window  = action === 'post' ? RATE_LIMIT.POST_WINDOW  : RATE_LIMIT.REPORT_WINDOW;
  const maxHits = action === 'post' ? RATE_LIMIT.POST_MAX     : RATE_LIMIT.REPORT_MAX;

  const windowStart = new Date(Date.now() - window * 1000).toISOString();

  const { results } = await db
    .prepare(`
      SELECT COUNT(*) AS cnt
      FROM   rate_log
      WHERE  ip_hash   = ?
      AND    action    = ?
      AND    created_at > ?
    `)
    .bind(ipHash, action, windowStart)
    .all();

  return (results[0]?.cnt ?? 0) >= maxHits;
}

// Log a new action for this IP.
export async function logAction(db, ipHash, action = 'post') {
  await db
    .prepare(`INSERT INTO rate_log (ip_hash, action) VALUES (?, ?)`)
    .bind(ipHash, action)
    .run();

  // Prune rows older than the longest window to keep the table small.
  const maxWindow = Math.max(RATE_LIMIT.POST_WINDOW, RATE_LIMIT.REPORT_WINDOW);
  const cutoff    = new Date(Date.now() - maxWindow * 1000).toISOString();
  await db
    .prepare(`DELETE FROM rate_log WHERE created_at < ?`)
    .bind(cutoff)
    .run();
}
