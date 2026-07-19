// ============================================================
// Rate Limiting (D1-backed, Dual-Signal)
// ============================================================
// Checks post/report frequency using TWO independent signals:
//
//   ip_hash          — SHA-256(salt:ip). Blocks the same IP directly.
//   fingerprint_hash — SHA-256(ip|ua|lang|client-hints). Catches IP
//                      rotation (VPNs, mobile carrier NAT) by tracking
//                      browser/device characteristics instead of IP alone.
//
// A request is rate-limited if EITHER signal is over the limit.
// Both signals are checked independently so neither can be gamed alone.
//
// The rate_log table is pruned on every write to stay small.
// ============================================================

import { RATE_LIMIT } from '../config/constants.js';

// Returns true if the IP or fingerprint is over the limit for the given action.
export async function isRateLimited(db, ipHash, action = 'post', fingerprintHash = null) {
  const window  = action === 'post' ? RATE_LIMIT.POST_WINDOW  : RATE_LIMIT.REPORT_WINDOW;
  const maxHits = action === 'post' ? RATE_LIMIT.POST_MAX     : RATE_LIMIT.REPORT_MAX;

  const windowStart = new Date(Date.now() - window * 1000).toISOString();

  // Check ip_hash
  const { results: ipResults } = await db
    .prepare(`
      SELECT COUNT(*) AS cnt
      FROM   rate_log
      WHERE  ip_hash    = ?
      AND    action     = ?
      AND    created_at > ?
    `)
    .bind(ipHash, action, windowStart)
    .all();

  if ((ipResults[0]?.cnt ?? 0) >= maxHits) return true;

  // Check fingerprint_hash (skip if not available — older requests or no UA)
  if (fingerprintHash) {
    const { results: fpResults } = await db
      .prepare(`
        SELECT COUNT(*) AS cnt
        FROM   rate_log
        WHERE  fingerprint_hash = ?
        AND    action           = ?
        AND    created_at       > ?
      `)
      .bind(fingerprintHash, action, windowStart)
      .all();

    if ((fpResults[0]?.cnt ?? 0) >= maxHits) return true;
  }

  return false;
}

// Log a new action for this IP + fingerprint pair.
export async function logAction(db, ipHash, action = 'post', fingerprintHash = null) {
  await db
    .prepare(`
      INSERT INTO rate_log (ip_hash, fingerprint_hash, action)
      VALUES (?, ?, ?)
    `)
    .bind(ipHash, fingerprintHash, action)
    .run();

  // Prune rows older than the longest window to keep the table bounded.
  const maxWindow = Math.max(RATE_LIMIT.POST_WINDOW, RATE_LIMIT.REPORT_WINDOW);
  const cutoff    = new Date(Date.now() - maxWindow * 1000).toISOString();
  await db
    .prepare(`DELETE FROM rate_log WHERE created_at < ?`)
    .bind(cutoff)
    .run();
}
