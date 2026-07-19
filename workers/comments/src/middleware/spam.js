// ============================================================
// Spam Detection
// ============================================================
// Rules run in order. First match short-circuits.
// Add new rules by exporting them and adding to RULES array.
// ============================================================

// Block comments that contain URLs (http/https/www)
function containsLinks(body) {
  return /https?:\/\/|www\./i.test(body);
}

// Block raw HTML or script injection attempts
function containsHTML(body) {
  return /<[a-z!\/]/i.test(body);
}

// Block obvious script injection patterns
function containsScript(body) {
  return /javascript:|data:|vbscript:|on\w+\s*=/i.test(body);
}

// Block comments that are just the same word/char repeated
function isRepeatedContent(body) {
  const clean = body.trim().toLowerCase();
  if (clean.length < 10) return false;
  // Check if the unique character ratio is suspiciously low
  const unique = new Set(clean.replace(/\s/g, '')).size;
  return unique < 3;
}

// Block all-caps shouting (over 80% uppercase letters)
function isAllCaps(body) {
  const letters = body.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 10) return false;
  const upper = body.replace(/[^A-Z]/g, '').length;
  return upper / letters.length > 0.80;
}

// Block copy-paste duplicates: same body already posted in this slug recently
// This check runs at the DB layer in ratelimit.js — placeholder here for reference.

const RULES = [
  { check: containsLinks,     message: 'Links are not allowed in comments.' },
  { check: containsHTML,      message: 'HTML is not allowed in comments.' },
  { check: containsScript,    message: 'Scripts are not allowed in comments.' },
  { check: isRepeatedContent, message: 'Comment appears to be spam.' },
  { check: isAllCaps,         message: 'Please do not write in all caps.' },
];

export function runSpamChecks(body) {
  for (const rule of RULES) {
    if (rule.check(body)) {
      return { pass: false, message: rule.message };
    }
  }
  return { pass: true };
}
