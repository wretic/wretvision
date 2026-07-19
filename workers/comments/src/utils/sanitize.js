// ============================================================
// Input Sanitization & Output Escaping
// ============================================================
// All comment bodies are stripped of HTML before storage.
// Output is escaped before being sent to the client.
// ============================================================

// Strip all HTML tags from input. Used before storing comment body.
export function stripHTML(str) {
  return String(str)
    .replace(/<[^>]*>/g, '')   // remove all tags
    .replace(/&/g, '&amp;')    // re-encode ampersands to prevent partial entities
    .trim();
}

// Escape for safe HTML output. Applied when returning data to client.
export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Normalize whitespace: collapse runs of spaces/newlines, trim
export function normalizeWhitespace(str) {
  return String(str)
    .replace(/\r\n/g, '\n')           // normalize line endings
    .replace(/[ \t]+/g, ' ')          // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')       // max 2 consecutive newlines
    .trim();
}

// Full clean pipeline for a comment body before storage
export function cleanBody(raw) {
  return normalizeWhitespace(stripHTML(raw));
}

// Full clean pipeline for a display name before storage
export function cleanName(raw) {
  return String(raw).replace(/<[^>]*>/g, '').trim();
}
