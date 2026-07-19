// ============================================================
// Reserved Username System
// ============================================================
// Prevents impersonation of site owner / staff roles.
// Normalization strips case, spaces, and common substitutions
// before checking, so "W R E T I C" and "wretic_" both block.
// ============================================================

const RESERVED = new Set([
  'wretvision',
  'wretic',
  'admin',
  'administrator',
  'moderator',
  'mod',
  'owner',
  'editor',
  'staff',
  'support',
  'official',
]);

// Normalize: lowercase, remove spaces and common leet substitutions
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')        // remove all whitespace
    .replace(/[_\-\.]+/g, '')   // remove underscores, dashes, dots
    .replace(/0/g, 'o')         // 0 → o
    .replace(/1/g, 'i')         // 1 → i
    .replace(/3/g, 'e')         // 3 → e
    .replace(/4/g, 'a')         // 4 → a
    .replace(/5/g, 's')         // 5 → s
    .replace(/\$/g, 's');       // $ → s
}

export function isReservedUsername(name) {
  return RESERVED.has(normalize(name));
}

export function getOwnerName() {
  return 'WretVision';
}

export function isOwnerName(name) {
  return normalize(name) === 'wretvision';
}
