// ============================================================
// Moderator Authentication
// ============================================================
// All /api/mod/* endpoints require:
//   Authorization: Bearer <OWNER_TOKEN>
//
// OWNER_TOKEN is set via: wrangler secret put OWNER_TOKEN
// It is also used as the IP hash salt — changing it invalidates
// all existing ip_hash lookups in the DB. Keep it stable.
//
// Phase 3 can introduce a separate MOD_TOKEN for cleaner
// separation, but a single token is sufficient for Phase 1.
// ============================================================

export function requireMod(request, env) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return { authorized: false, error: 'Authorization header required.' };
  }
  const token = header.slice(7).trim();
  if (!token || !env.OWNER_TOKEN || token !== env.OWNER_TOKEN) {
    return { authorized: false, error: 'Invalid moderator token.' };
  }
  return { authorized: true };
}
