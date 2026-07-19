// ============================================================
// Reserved Username System — Phase 1.1 (Hardened)
// ============================================================
// Two-tier impersonation protection:
//
//   BRANDED_TERMS  — site-owner identifiers.
//                    A name is blocked if it CONTAINS any of these
//                    after normalization. Catches prefixes (OfficialWretVision),
//                    suffixes (WretVisionTV), and leet variants (Wr3tVision).
//
//   ROLE_TERMS     — staff/admin role words.
//                    Blocked on EXACT match after normalization only,
//                    to avoid false-positives ("modification" ≠ "mod").
//
// Normalization pipeline (applied before any check):
//   1. Lowercase
//   2. Unicode lookalike → ASCII (Cyrillic, Greek, homoglyphs)
//   3. Leet substitutions (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s)
//   4. Strip all non-alphanumeric characters (spaces, _ - . etc.)
// ============================================================

// Identifiers that must never appear anywhere in a username.
const BRANDED_TERMS = [
  'wretvision',
  'wretic',
];

// Role labels that block exact-match names only.
const ROLE_TERMS = new Set([
  'admin',
  'administrator',
  'moderator',
  'mod',
  'owner',
  'editor',
  'staff',
  'support',
  'official',
  'system',
]);

// ── Normalization ─────────────────────────────────────────────────────────────

function normalize(name) {
  return name
    .toLowerCase()

    // ── Unicode homoglyphs → ASCII ─────────────────────────────────────────
    // Cyrillic and Greek characters commonly used to spoof Latin letters.
    .replace(/[аạа]/g,   'a')   // Cyrillic а / Latin a-variants
    .replace(/[еẹ]/g,    'e')   // Cyrillic е
    .replace(/[іꞮ]/g,   'i')   // Cyrillic і
    .replace(/[оο]/g,    'o')   // Cyrillic о / Greek omicron
    .replace(/[ѕ]/g,     's')   // Cyrillic ѕ (dze)
    .replace(/[ᴡ]/g,     'w')   // Small caps W
    .replace(/[ʀ]/g,     'r')   // Small caps R
    .replace(/[ᴛ]/g,     't')   // Small caps T
    .replace(/[ᴠ]/g,     'v')   // Small caps V
    .replace(/[ɴ]/g,     'n')   // Small caps N
    .replace(/[ʟ]/g,     'l')   // Small caps L
    // Pipe and capital-I look identical in some fonts
    .replace(/\|/g,      'i')
    // Zero-width characters (invisible spoofing)
    .replace(/[​-‍﻿]/g, '')

    // ── Leet substitutions ─────────────────────────────────────────────────
    .replace(/0/g,  'o')
    .replace(/1/g,  'i')
    .replace(/3/g,  'e')
    .replace(/4/g,  'a')
    .replace(/5/g,  's')
    .replace(/7/g,  't')
    .replace(/8/g,  'b')
    .replace(/\$/g, 's')
    .replace(/@/g,  'a')

    // ── Strip all non-alphanumeric characters ──────────────────────────────
    // Removes spaces, underscores, hyphens, dots, etc.
    .replace(/[^a-z0-9]/g, '');
}

// ── Public API ────────────────────────────────────────────────────────────────

export function isReservedUsername(name) {
  if (!name || typeof name !== 'string') return false;

  const n = normalize(name);

  // Block if normalized name contains any branded term.
  // This catches: OfficialWretVision → officialwretvision → contains 'wretvision'
  //               WretVisionTV       → wretvisiontv       → contains 'wretvision'
  //               Wr3tVision         → wretvision         → exact match (still a substring)
  //               WreticOfficial     → wreticofficial     → contains 'wretic'
  for (const term of BRANDED_TERMS) {
    if (n.includes(term)) return true;
  }

  // Block if normalized name exactly matches a role term.
  if (ROLE_TERMS.has(n)) return true;

  return false;
}

export function getOwnerName() {
  return 'WretVision';
}

export function isOwnerName(name) {
  return normalize(name) === 'wretvision';
}
