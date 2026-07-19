// ============================================================
// IP Hashing Utility
// ============================================================
// IPs are never stored raw. We hash them with a salt so they
// cannot be reversed even if the DB is compromised.
// The salt is stored as the OWNER_TOKEN env secret (reused).
// A dedicated IP_SALT secret can be added in future.
// ============================================================

export async function hashIP(ip, salt = '') {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${ip}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getClientIP(request) {
  // Cloudflare sets CF-Connecting-IP on all requests
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    '0.0.0.0'
  );
}
