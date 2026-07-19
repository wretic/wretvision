// ============================================================
// GET /api/comments
// ============================================================
// Returns paginated approved comments + replies for a review slug.
// Query params:
//   slug   (required) — review slug, e.g. "evil-dead-burn-review"
//   page   (optional) — page number, default 1
//   limit  (optional) — results per page, default 20, max 50
//
// Shadow moderation (Phase 2):
//   Comments with shadow_hidden = 1 are excluded from all responses here.
//   Phase 2 will pass the requester's IP hash so shadow-hidden comments are
//   visible ONLY to their author (matching ip_hash). The getComments and
//   getReplies queries in queries.js already filter shadow_hidden = 0.
//   Phase 2 change: add requesterIpHash param and change filter to
//   (shadow_hidden = 0 OR ip_hash = ?).
// ============================================================

import { getComments, getReplies, getCommentCount } from '../db/queries.js';
import { validateSlug, validatePaginationParams }    from '../middleware/validation.js';
import { escapeHTML }                                 from '../utils/sanitize.js';
import { jsonOk, jsonError }                          from './response.js';

export async function handleGetComments(request, env) {
  const url    = new URL(request.url);
  const slug   = url.searchParams.get('slug');
  const limitP = url.searchParams.get('limit');
  const pageP  = url.searchParams.get('page');

  const slugCheck = validateSlug(slug);
  if (!slugCheck.valid) return jsonError(slugCheck.error, 400);

  const { limit, offset } = validatePaginationParams(limitP, pageP);

  const [comments, total] = await Promise.all([
    getComments(env.DB, slug, limit, offset),
    getCommentCount(env.DB, slug),
  ]);

  // Fetch replies for each top-level comment
  const withReplies = await Promise.all(
    comments.map(async (c) => {
      const replies = await getReplies(env.DB, c.id);
      return {
        ...sanitizeComment(c),
        replies: replies.map(sanitizeComment),
      };
    })
  );

  return jsonOk({
    slug,
    total,
    page:     Math.floor(offset / limit) + 1,
    limit,
    comments: withReplies,
  });
}

// Strip internal fields and escape output before sending to client.
// ip_hash, report_count, and shadow_hidden are intentionally NOT sent.
function sanitizeComment(c) {
  return {
    id:           c.id,
    parent_id:    c.parent_id,
    display_name: escapeHTML(c.display_name),
    body:         c.is_deleted ? '[deleted]' : escapeHTML(c.body),
    is_pinned:    Boolean(c.is_pinned),
    is_spoiler:   Boolean(c.is_spoiler),
    is_deleted:   Boolean(c.is_deleted),
    is_edited:    Boolean(c.is_edited),
    is_locked:    Boolean(c.is_locked),
    created_at:   c.created_at,
  };
}
