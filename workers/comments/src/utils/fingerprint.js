// ============================================================
// Request Fingerprinting (Privacy-Preserving)
// ============================================================
// Produces a SHA-256 hash from available request metadata.
// Used alongside ip_hash to detect rate-limit evasion via
// IP rotation (VPNs, mobile carriers, etc.).
//
// What is read:
//   CF-Connecting-IP           (Cloudflare, always present)
//   User-Agent                 (browser/bot identifier)
//   Accept-Language            (locale preference)
//   Sec-CH-UA                  (Client Hints — brand list, Chromium only)
//   Sec-CH-UA-Platform         (Client Hints — OS name)
//   Sec-CH-UA-Mobile           (Client Hints — mobile flag)
//
// What is stored:
//   Only the SHA-256 hash. Raw header values are never persisted.
//
// What is NOT read or stored:
//   Cookie, Authorization, or any content that could identify a person.
// ============================================================

export async function buildFingerprint(request, ip) {
  const ua       = request.headers.get('User-Agent')        || '';
  const lang     = request.headers.get('Accept-Language')   || '';
  // Cloudflare Client Hints — sent by Chromium-based browsers automatically.
  // Absent on Firefox/Safari: those fields resolve to ''.
  const uaBrand  = request.headers.get('Sec-CH-UA')         || '';
  const platform = request.headers.get('Sec-CH-UA-Platform')|| '';
  const mobile   = request.headers.get('Sec-CH-UA-Mobile')  || '';

  // Delimiter is | to prevent values from bleeding into each other.
  const raw = `${ip}|${ua}|${lang}|${uaBrand}|${platform}|${mobile}`;

  const encoder    = new TextEncoder();
  const data       = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
