// ============================================================
// WretVision Comments — Cloudflare Worker Entry Point
// ============================================================
// Routes:
//   GET  /api/comments          — fetch comments for a review
//   POST /api/comments          — post a new comment or reply
//   POST /api/comments/report   — report a comment
//   OPTIONS *                   — CORS preflight
// ============================================================

import { handleGetComments } from './api/comments.js';
import { handlePostComment } from './api/post.js';
import { handleReport }      from './api/report.js';
import { corsPreflightResponse, jsonError } from './api/response.js';

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const method = request.method.toUpperCase();
    const path   = url.pathname;

    // ── CORS preflight ────────────────────────────────────────
    if (method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    // ── Reject non-wretvision.com origins in production ──────
    if (env.ENVIRONMENT === 'production') {
      const origin = request.headers.get('Origin') || '';
      if (origin && origin !== env.CORS_ORIGIN) {
        return jsonError('Forbidden.', 403);
      }
    }

    // ── Router ────────────────────────────────────────────────
    try {
      if (path === '/api/comments') {
        if (method === 'GET')  return await handleGetComments(request, env);
        if (method === 'POST') return await handlePostComment(request, env);
      }

      if (path === '/api/comments/report' && method === 'POST') {
        return await handleReport(request, env);
      }

      return jsonError('Not found.', 404);

    } catch (err) {
      console.error('Unhandled error:', err?.message ?? err);
      return jsonError('Internal server error.', 500);
    }
  },
};
