// ============================================================
// Input Validation
// ============================================================
// All validation runs before any DB access.
// Returns { valid: true } or { valid: false, error: string }
// ============================================================

import { COMMENT, MOD_NOTE, NOTE_CATEGORIES } from '../config/constants.js';
import { isReservedUsername } from '../utils/reserved.js';

export function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'review_slug is required.' };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Invalid review slug format.' };
  }
  if (slug.length > 120) {
    return { valid: false, error: 'Slug too long.' };
  }
  return { valid: true };
}

export function validateDisplayName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Display name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < COMMENT.MIN_NAME_LENGTH) {
    return { valid: false, error: `Display name must be at least ${COMMENT.MIN_NAME_LENGTH} characters.` };
  }
  if (trimmed.length > COMMENT.MAX_NAME_LENGTH) {
    return { valid: false, error: `Display name must be ${COMMENT.MAX_NAME_LENGTH} characters or fewer.` };
  }
  if (isReservedUsername(trimmed)) {
    return { valid: false, error: 'That display name is reserved.' };
  }
  return { valid: true };
}

export function validateBody(body) {
  if (!body || typeof body !== 'string') {
    return { valid: false, error: 'Comment body is required.' };
  }
  const trimmed = body.trim();
  if (trimmed.length < COMMENT.MIN_BODY_LENGTH) {
    return { valid: false, error: `Comment must be at least ${COMMENT.MIN_BODY_LENGTH} characters.` };
  }
  if (trimmed.length > COMMENT.MAX_BODY_LENGTH) {
    return { valid: false, error: `Comment must be ${COMMENT.MAX_BODY_LENGTH} characters or fewer.` };
  }
  return { valid: true };
}

export function validateParentId(parentId) {
  if (parentId === null || parentId === undefined) {
    return { valid: true }; // top-level comment, no parent required
  }
  const parsed = parseInt(parentId, 10);
  if (isNaN(parsed) || parsed < 1) {
    return { valid: false, error: 'Invalid parent_id.' };
  }
  return { valid: true, value: parsed };
}

export function validateCommentId(id) {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed < 1) {
    return { valid: false, error: 'Invalid comment ID.' };
  }
  return { valid: true, value: parsed };
}

export function validateReportReason(reason) {
  const allowed = ['spam', 'harassment', 'spoiler', 'inappropriate', 'other'];
  if (!reason) return { valid: true, value: 'inappropriate' }; // default
  if (!allowed.includes(reason)) {
    return { valid: false, error: 'Invalid report reason.' };
  }
  return { valid: true, value: reason };
}

export function validatePaginationParams(limitRaw, pageRaw) {
  const limit = Math.min(
    parseInt(limitRaw, 10) || 20,
    50  // hard cap
  );
  const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
  return { limit, offset: (page - 1) * limit };
}

// ── Moderator note validators ──────────────────────────────────────────────────

export function validateNoteBody(body) {
  if (!body || typeof body !== 'string') {
    return { valid: false, error: 'Note body is required.' };
  }
  const trimmed = body.trim();
  if (trimmed.length < MOD_NOTE.MIN_BODY_LENGTH) {
    return { valid: false, error: `Note must be at least ${MOD_NOTE.MIN_BODY_LENGTH} characters.` };
  }
  if (trimmed.length > MOD_NOTE.MAX_BODY_LENGTH) {
    return { valid: false, error: `Note must be ${MOD_NOTE.MAX_BODY_LENGTH} characters or fewer.` };
  }
  return { valid: true, value: trimmed };
}

export function validateNoteCategory(category) {
  if (!category) return { valid: true, value: 'general' };
  if (!NOTE_CATEGORIES.includes(category)) {
    return { valid: false, error: `Invalid category. Allowed: ${NOTE_CATEGORIES.join(', ')}.` };
  }
  return { valid: true, value: category };
}

export function validateIpHash(hash) {
  if (!hash || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) {
    return { valid: false, error: 'Invalid commenter identifier.' };
  }
  return { valid: true };
}
