// ============================================================
// WretVision Comments — Cloudflare Worker Entry Point
// ============================================================
// Public routes:
//   GET  /api/comments          — fetch comments for a review
//   POST /api/comments          — post a new comment or reply
//   POST /api/comments/report   — report a comment
//   OPTIONS *                   — CORS preflight
//
// Moderator routes (require Authorization: Bearer <OWNER_TOKEN>):
//   GET    /api/mod/commenter/:hash          — commenter profile + stats
//   GET    /api/mod/commenter/:hash/history  — paginated comment history
//   GET    /api/mod/commenter/:hash/notes    — moderator notes
//   POST   /api/mod/commenter/:hash/notes    — add note
//   POST   /api/mod/commenter/:hash/ban      — ban commenter
//   POST   /api/mod/commenter/:hash/unban    — lift ban
//   PUT    /api/mod/notes/:id                — edit note
//   DELETE /api/mod/notes/:id                — delete note
// ============================================================

import { handleGetComments }          from './api/comments.js';
import { handlePostComment }          from './api/post.js';
import { handleReport }               from './api/report.js';
import { handleMod }                  from './api/mod.js';
import { corsPreflightResponse, jsonError } from './api/response.js';

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const method = request.method.toUpperCase();
    const path   = url.pathname;

    // ── CORS preflight ────────────────────────────────────────
    if (method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    // ── Reject non-wretvision.com origins in production ──────
    // Mod routes are exempt: they are called server-side or from the
    // dashboard and do not require an Origin header.
    if (env.ENVIRONMENT === 'production' && !path.startsWith('/api/mod/')) {
      const origin = request.headers.get('Origin') || '';
      if (origin && origin !== env.CORS_ORIGIN) {
        return jsonError('Forbidden.', 403);
      }
    }

    // ── Router ────────────────────────────────────────────────
    try {
      // Public comment API
      if (path === '/api/comments') {
        if (method === 'GET')  return await handleGetComments(request, env);
        if (method === 'POST') return await handlePostComment(request, env);
      }

      if (path === '/api/comments/report' && method === 'POST') {
        return await handleReport(request, env);
      }

      // Moderator API — auth checked inside handleMod
      if (path.startsWith('/api/mod/')) {
        return await handleMod(request, env, path);
      }

      return jsonError('Not found.', 404);

    } catch (err) {
      console.error('Unhandled error:', err?.message ?? err);
      return jsonError('Internal server error.', 500);
    }
  },
};
