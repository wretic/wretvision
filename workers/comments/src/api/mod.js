// ============================================================
// Moderator API  (/api/mod/*)
// ============================================================
// All routes require:  Authorization: Bearer <OWNER_TOKEN>
//
// Phase 1–2 routes:
//   GET    /api/mod/commenter/:hash
//   GET    /api/mod/commenter/:hash/history
//   GET    /api/mod/commenter/:hash/notes
//   POST   /api/mod/commenter/:hash/notes
//   POST   /api/mod/commenter/:hash/ban
//   POST   /api/mod/commenter/:hash/unban
//   PUT    /api/mod/notes/:id
//   DELETE /api/mod/notes/:id
//
// Phase 3 routes:
//   GET    /api/mod/stats
//   GET    /api/mod/comments
//   GET    /api/mod/comment/:id/history
//   POST   /api/mod/comment/:id/approve
//   POST   /api/mod/comment/:id/reject
//   DELETE /api/mod/comment/:id
//   POST   /api/mod/comment/:id/hide
//   POST   /api/mod/comment/:id/restore
//   POST   /api/mod/comment/:id/pin
//   POST   /api/mod/comment/:id/unpin
//   GET    /api/mod/reports
//   POST   /api/mod/report/:id/resolve
// ============================================================

import { requireMod }                             from '../middleware/auth.js';
import { validatePaginationParams }               from '../middleware/validation.js';
import { validateNoteBody, validateNoteCategory } from '../middleware/validation.js';
import { logModAction }                           from '../db/audit.js';
import {
  getCommenterStats, getCommenterProfile, upsertBanState,
  getFingerprints, getFingerprintCount,
  getCommenterHistory, getCommenterCommentCount,
  getNotes, getNoteCount, getNoteById, insertNote, updateNote, deleteNote,
  listModComments, getCommentByIdFull,
  setCommentStatus, setCommentDeleted, setCommentHidden, setCommentPinned,
  listReports, deleteReport, getCommentAuditLog, getModStats,
} from '../db/mod_queries.js';
import { MOD_ACTIONS }           from '../config/constants.js';
import { jsonOk, jsonError }     from './response.js';
import { insertComment }         from '../db/queries.js';
import { cleanBody, cleanName }  from '../utils/sanitize.js';

// ── Path parser ───────────────────────────────────────────────────────────────

function parseModPath(path) {
  if (path === '/api/mod/stats')    return { route: 'stats' };
  if (path === '/api/mod/comments') return { route: 'mod_comments' };
  if (path === '/api/mod/reports')  return { route: 'mod_reports' };

  const reportResolve = path.match(/^\/api\/mod\/report\/(\d+)\/resolve$/);
  if (reportResolve) return { route: 'report_resolve', id: +reportResolve[1] };

  const commentAction = path.match(/^\/api\/mod\/comment\/(\d+)\/(approve|reject|hide|restore|pin|unpin|history|reply)$/);
  if (commentAction) return { route: 'comment_action', id: +commentAction[1], action: commentAction[2] };

  const commentBase = path.match(/^\/api\/mod\/comment\/(\d+)$/);
  if (commentBase) return { route: 'comment_base', id: +commentBase[1] };

  const commenterBase = path.match(/^\/api\/mod\/commenter\/([a-f0-9]{64})$/);
  if (commenterBase) return { route: 'commenter', hash: commenterBase[1] };

  const historyPath = path.match(/^\/api\/mod\/commenter\/([a-f0-9]{64})\/history$/);
  if (historyPath) return { route: 'history', hash: historyPath[1] };

  const notesPath = path.match(/^\/api\/mod\/commenter\/([a-f0-9]{64})\/notes$/);
  if (notesPath) return { route: 'notes', hash: notesPath[1] };

  const banPath = path.match(/^\/api\/mod\/commenter\/([a-f0-9]{64})\/ban$/);
  if (banPath) return { route: 'ban', hash: banPath[1] };

  const unbanPath = path.match(/^\/api\/mod\/commenter\/([a-f0-9]{64})\/unban$/);
  if (unbanPath) return { route: 'unban', hash: unbanPath[1] };

  const noteById = path.match(/^\/api\/mod\/notes\/(\d+)$/);
  if (noteById) return { route: 'note_by_id', id: +noteById[1] };

  return null;
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function handleMod(request, env, path) {
  const auth = requireMod(request, env);
  if (!auth.authorized) return jsonError(auth.error, 401);

  const method = request.method.toUpperCase();
  const parsed = parseModPath(path);
  if (!parsed) return jsonError('Not found.', 404);

  try {
    switch (parsed.route) {

      case 'stats':
        if (method === 'GET') return await handleGetStats(env.DB);
        break;

      case 'mod_comments':
        if (method === 'GET') return await handleListComments(request, env.DB);
        break;

      case 'comment_action':
        if (parsed.action === 'history' && method === 'GET')
          return await handleCommentHistory(env.DB, parsed.id);
        if (parsed.action === 'reply' && method === 'POST')
          return await handleModReply(request, env.DB, parsed.id);
        if (method === 'POST')
          return await handleCommentAction(env, parsed.id, parsed.action);
        break;

      case 'comment_base':
        if (method === 'DELETE') return await handleDeleteComment(env, parsed.id);
        break;

      case 'mod_reports':
        if (method === 'GET') return await handleListReports(request, env.DB);
        break;

      case 'report_resolve':
        if (method === 'POST') return await handleResolveReport(env.DB, parsed.id);
        break;

      case 'commenter':
        if (method === 'GET') return await handleGetProfile(env.DB, parsed.hash);
        break;

      case 'history':
        if (method === 'GET') return await handleGetHistory(request, env.DB, parsed.hash);
        break;

      case 'notes':
        if (method === 'GET')  return await handleGetNotes(env.DB, parsed.hash);
        if (method === 'POST') return await handleAddNote(request, env, parsed.hash);
        break;

      case 'ban':
        if (method === 'POST') return await handleBan(request, env, parsed.hash);
        break;

      case 'unban':
        if (method === 'POST') return await handleUnban(request, env, parsed.hash);
        break;

      case 'note_by_id':
        if (method === 'PUT')    return await handleUpdateNote(request, env, parsed.id);
        if (method === 'DELETE') return await handleDeleteNote(request, env, parsed.id);
        break;
    }
  } catch (err) {
    console.error('[mod] Unhandled error:', err?.message ?? err);
    return jsonError('Internal server error.', 500);
  }

  return jsonError('Method not allowed.', 405);
}

// ── Phase 3 handlers ──────────────────────────────────────────────────────────

async function handleGetStats(db) {
  return jsonOk(await getModStats(db));
}

async function handleListComments(request, db) {
  const url    = new URL(request.url);
  const status = url.searchParams.get('status') || 'all';
  const search = url.searchParams.get('search') || '';
  const slug   = url.searchParams.get('slug')   || '';
  const sort    = url.searchParams.get('sort')  || 'newest';
  const replyRaw = url.searchParams.get('reply');
  const reply    = replyRaw === '1' ? true : replyRaw === '0' ? false : undefined;
  const { limit, offset } = validatePaginationParams(
    url.searchParams.get('limit'),
    url.searchParams.get('page'),
  );
  const page = Math.floor(offset / limit) + 1;
  const { comments, total } = await listModComments(db, { status, search, slug, page, limit, sort, reply });
  return jsonOk({ comments, total, page, limit });
}

async function handleCommentHistory(db, id) {
  const comment = await getCommentByIdFull(db, id);
  if (!comment) return jsonError('Comment not found.', 404);
  const log = await getCommentAuditLog(db, id);
  return jsonOk({ comment_id: id, log });
}

async function handleCommentAction(env, id, action) {
  const comment = await getCommentByIdFull(env.DB, id);
  if (!comment) return jsonError('Comment not found.', 404);

  const ACTION_MAP = {
    approve: { fn: () => setCommentStatus(env.DB, id, 'approved'), audit: MOD_ACTIONS.APPROVE,        msg: 'Comment approved.' },
    reject:  { fn: () => setCommentStatus(env.DB, id, 'rejected'), audit: MOD_ACTIONS.REJECT,         msg: 'Comment rejected.' },
    hide:    { fn: () => setCommentHidden(env.DB, id, true),        audit: MOD_ACTIONS.SHADOW_HIDE,    msg: 'Comment hidden.' },
    restore: { fn: () => setCommentHidden(env.DB, id, false),       audit: MOD_ACTIONS.SHADOW_RESTORE, msg: 'Comment restored.' },
    pin:     { fn: () => setCommentPinned(env.DB, id, true),        audit: MOD_ACTIONS.PIN,            msg: 'Comment pinned.' },
    unpin:   { fn: () => setCommentPinned(env.DB, id, false),       audit: MOD_ACTIONS.UNPIN,          msg: 'Comment unpinned.' },
  };

  const op = ACTION_MAP[action];
  if (!op) return jsonError('Unknown action.', 400);

  await op.fn();
  await logModAction(env.DB, {
    moderator:  'owner',
    action:     op.audit,
    commentId:  id,
    reviewSlug: comment.review_slug,
    prevStatus: comment.status,
    newStatus:  action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null,
  });

  return jsonOk({ message: op.msg });
}

async function handleDeleteComment(env, id) {
  const comment = await getCommentByIdFull(env.DB, id);
  if (!comment) return jsonError('Comment not found.', 404);
  await setCommentDeleted(env.DB, id);
  await logModAction(env.DB, {
    moderator: 'owner', action: MOD_ACTIONS.DELETE,
    commentId: id, reviewSlug: comment.review_slug, prevStatus: comment.status,
  });
  return jsonOk({ message: 'Comment deleted.' });
}

async function handleListReports(request, db) {
  const url = new URL(request.url);
  const { limit, offset } = validatePaginationParams(
    url.searchParams.get('limit'),
    url.searchParams.get('page'),
  );
  const page = Math.floor(offset / limit) + 1;
  const { reports, total } = await listReports(db, { page, limit });
  return jsonOk({ reports, total, page, limit });
}

async function handleResolveReport(db, id) {
  await deleteReport(db, id);
  return jsonOk({ message: 'Report resolved.' });
}

async function handleModReply(request, db, parentId) {
  const parent = await getCommentByIdFull(db, parentId);
  if (!parent)             return jsonError('Comment not found.', 404);
  if (parent.parent_id)   return jsonError('Cannot reply to a reply.', 400);
  if (parent.is_deleted)  return jsonError('Cannot reply to a deleted comment.', 400);

  let body;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }

  const text = typeof body?.body === 'string' ? cleanBody(body.body.trim()) : '';
  const name = typeof body?.name === 'string' ? cleanName(body.name.trim()) : 'WretVision';
  if (!text || text.length < 1) return jsonError('Reply body is required.', 400);

  const id = await insertComment(db, {
    review_slug:  parent.review_slug,
    parent_id:    parentId,
    display_name: name,
    body:         text,
    is_spoiler:   false,
    ip_hash:      'owner',
  });

  await logModAction(db, {
    moderator:  'owner',
    action:     'mod_reply',
    commentId:  parentId,
    reviewSlug: parent.review_slug,
    reason:     `Owner reply #${id}`,
  });

  return jsonOk({ id, message: 'Reply posted.' }, 201);
}

// ── Phase 1–2 handlers (unchanged) ───────────────────────────────────────────

async function handleGetProfile(db, ipHash) {
  const [stats, profile, noteCount, fpCount] = await Promise.all([
    getCommenterStats(db, ipHash),
    getCommenterProfile(db, ipHash),
    getNoteCount(db, ipHash),
    getFingerprintCount(db, ipHash),
  ]);
  return jsonOk({
    ip_hash: ipHash, stats,
    profile: profile
      ? { is_banned: Boolean(profile.is_banned), ban_reason: profile.ban_reason, banned_at: profile.banned_at, banned_by: profile.banned_by, created_at: profile.created_at }
      : { is_banned: false, ban_reason: null, banned_at: null, banned_by: null, created_at: null },
    note_count: noteCount, fingerprint_count: fpCount,
  });
}

async function handleGetHistory(request, db, ipHash) {
  const url = new URL(request.url);
  const { limit, offset } = validatePaginationParams(url.searchParams.get('limit'), url.searchParams.get('page'));
  const [comments, total] = await Promise.all([
    getCommenterHistory(db, ipHash, limit, offset),
    getCommenterCommentCount(db, ipHash),
  ]);
  return jsonOk({ ip_hash: ipHash, total, page: Math.floor(offset / limit) + 1, limit, comments });
}

async function handleGetNotes(db, ipHash) {
  return jsonOk({ ip_hash: ipHash, notes: await getNotes(db, ipHash) });
}

async function handleAddNote(request, env, ipHash) {
  let body;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const bodyCheck = validateNoteBody(body?.body);
  if (!bodyCheck.valid) return jsonError(bodyCheck.error, 400);
  const catCheck = validateNoteCategory(body?.category);
  if (!catCheck.valid) return jsonError(catCheck.error, 400);
  const id = await insertNote(env.DB, ipHash, 'moderator', bodyCheck.value, catCheck.value);
  await logModAction(env.DB, { moderator: 'moderator', action: MOD_ACTIONS.ADD_NOTE, reason: `Note #${id} added [${catCheck.value}]` });
  return jsonOk({ id, message: 'Note added.' }, 201);
}

async function handleBan(request, env, ipHash) {
  let body;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : null;
  await upsertBanState(env.DB, ipHash, { isBanned: true, banReason: reason, bannedBy: 'moderator' });
  await logModAction(env.DB, { moderator: 'moderator', action: MOD_ACTIONS.BAN, reason });
  return jsonOk({ message: 'Commenter banned.' });
}

async function handleUnban(request, env, ipHash) {
  await upsertBanState(env.DB, ipHash, { isBanned: false, banReason: null, bannedBy: null });
  await logModAction(env.DB, { moderator: 'moderator', action: MOD_ACTIONS.UNBAN });
  return jsonOk({ message: 'Ban lifted.' });
}

async function handleUpdateNote(request, env, noteId) {
  let body;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const note = await getNoteById(env.DB, noteId);
  if (!note) return jsonError('Note not found.', 404);
  const bodyCheck = validateNoteBody(body?.body);
  if (!bodyCheck.valid) return jsonError(bodyCheck.error, 400);
  const catCheck = validateNoteCategory(body?.category ?? note.category);
  if (!catCheck.valid) return jsonError(catCheck.error, 400);
  await updateNote(env.DB, noteId, bodyCheck.value, catCheck.value);
  await logModAction(env.DB, { moderator: 'moderator', action: MOD_ACTIONS.EDIT_NOTE, reason: `Note #${noteId} edited` });
  return jsonOk({ message: 'Note updated.' });
}

async function handleDeleteNote(request, env, noteId) {
  const note = await getNoteById(env.DB, noteId);
  if (!note) return jsonError('Note not found.', 404);
  await deleteNote(env.DB, noteId);
  await logModAction(env.DB, { moderator: 'moderator', action: MOD_ACTIONS.DELETE_NOTE, reason: `Note #${noteId} deleted [was: ${note.category}]` });
  return jsonOk({ message: 'Note deleted.' });
}
