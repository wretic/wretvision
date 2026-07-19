// ============================================================
// POST /api/comments
// ============================================================
// Creates a new top-level comment OR a reply (parent_id set).
// Body (JSON):
//   review_slug           (required)
//   display_name          (required)
//   body                  (required)
//   parent_id             (optional) — set to post a reply
//   is_spoiler            (optional, boolean)
//   cf_turnstile_response (required)
// ============================================================

import { insertComment, getCommentById } from '../db/queries.js';
import {
  validateSlug,
  validateDisplayName,
  validateBody,
  validateParentId,
} from '../middleware/validation.js';
import { runSpamChecks }     from '../middleware/spam.js';
import { verifyTurnstile }   from '../middleware/turnstile.js';
import { isRateLimited, logAction } from '../middleware/ratelimit.js';
import { cleanBody, cleanName }     from '../utils/sanitize.js';
import { hashIP, getClientIP }      from '../utils/hash.js';
import { jsonOk, jsonError }        from './response.js';

export async function handlePostComment(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const {
    review_slug,
    display_name,
    body: commentBody,
    parent_id,
    is_spoiler = false,
    cf_turnstile_response,
  } = body;

  // ── Turnstile first (cheapest rejection) ──────────────────
  const ip     = getClientIP(request);
  const tsCheck = await verifyTurnstile(
    cf_turnstile_response,
    env.TURNSTILE_SECRET_KEY,
    ip,
  );
  if (!tsCheck.success) return jsonError(tsCheck.error, 403);

  // ── IP hash (used for rate limiting) ─────────────────────
  const ipHash = await hashIP(ip, env.OWNER_TOKEN ?? '');

  // ── Rate limiting ─────────────────────────────────────────
  const limited = await isRateLimited(env.DB, ipHash, 'post');
  if (limited) return jsonError('You are posting too frequently. Please wait a few minutes.', 429);

  // ── Input validation ──────────────────────────────────────
  const slugCheck = validateSlug(review_slug);
  if (!slugCheck.valid) return jsonError(slugCheck.error, 400);

  const nameCheck = validateDisplayName(display_name);
  if (!nameCheck.valid) return jsonError(nameCheck.error, 400);

  const bodyCheck = validateBody(commentBody);
  if (!bodyCheck.valid) return jsonError(bodyCheck.error, 400);

  const parentCheck = validateParentId(parent_id);
  if (!parentCheck.valid) return jsonError(parentCheck.error, 400);

  // ── If replying, verify parent exists and belongs to same slug ──
  if (parentCheck.value) {
    const parent = await getCommentById(env.DB, parentCheck.value);
    if (!parent) return jsonError('Parent comment not found.', 404);
    if (parent.review_slug !== review_slug) return jsonError('Parent comment belongs to a different review.', 400);
    if (parent.parent_id !== null) return jsonError('Replies cannot be nested beyond one level.', 400);
  }

  // ── Spam checks ───────────────────────────────────────────
  const spam = runSpamChecks(commentBody);
  if (!spam.pass) return jsonError(spam.message, 422);

  // ── Clean and store ───────────────────────────────────────
  const cleanedBody = cleanBody(commentBody);
  const cleanedName = cleanName(display_name);

  const id = await insertComment(env.DB, {
    review_slug,
    parent_id:    parentCheck.value ?? null,
    display_name: cleanedName,
    body:         cleanedBody,
    is_spoiler:   Boolean(is_spoiler),
    ip_hash:      ipHash,
  });

  await logAction(env.DB, ipHash, 'post');

  return jsonOk(
    { id, message: 'Comment submitted and awaiting moderation.' },
    201,
  );
}
