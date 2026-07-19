// ============================================================
// POST /api/comments/report
// ============================================================
// Reports a comment for moderation review.
// Body (JSON):
//   comment_id            (required)
//   reason                (optional) — 'spam' | 'harassment' | 'spoiler' | 'inappropriate' | 'other'
//   cf_turnstile_response (required)
// ============================================================

import { insertReport, getCommentById } from '../db/queries.js';
import { validateCommentId, validateReportReason } from '../middleware/validation.js';
import { verifyTurnstile }    from '../middleware/turnstile.js';
import { isRateLimited, logAction } from '../middleware/ratelimit.js';
import { hashIP, getClientIP }      from '../utils/hash.js';
import { jsonOk, jsonError }        from './response.js';

export async function handleReport(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const { comment_id, reason, cf_turnstile_response } = body;

  const ip     = getClientIP(request);
  const tsCheck = await verifyTurnstile(
    cf_turnstile_response,
    env.TURNSTILE_SECRET_KEY,
    ip,
  );
  if (!tsCheck.success) return jsonError(tsCheck.error, 403);

  const ipHash = await hashIP(ip, env.OWNER_TOKEN ?? '');

  const limited = await isRateLimited(env.DB, ipHash, 'report');
  if (limited) return jsonError('Too many reports. Please wait before reporting again.', 429);

  const idCheck = validateCommentId(comment_id);
  if (!idCheck.valid) return jsonError(idCheck.error, 400);

  const reasonCheck = validateReportReason(reason);
  if (!reasonCheck.valid) return jsonError(reasonCheck.error, 400);

  const comment = await getCommentById(env.DB, idCheck.value);
  if (!comment) return jsonError('Comment not found.', 404);

  const inserted = await insertReport(env.DB, idCheck.value, ipHash, reasonCheck.value);
  if (!inserted) return jsonError('You have already reported this comment.', 409);

  await logAction(env.DB, ipHash, 'report');

  return jsonOk({ message: 'Report submitted. Thank you.' });
}
