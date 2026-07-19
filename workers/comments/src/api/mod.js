// ============================================================
// Moderator API  (/api/mod/*)
// ============================================================
// All routes require:  Authorization: Bearer <OWNER_TOKEN>
// All responses are internal — never linked from public pages.
//
// Routes:
//   GET    /api/mod/commenter/:hash          — profile + live stats
//   GET    /api/mod/commenter/:hash/history  — paginated comment history
//   GET    /api/mod/commenter/:hash/notes    — moderator notes
//   POST   /api/mod/commenter/:hash/notes    — add note
//   POST   /api/mod/commenter/:hash/ban      — ban commenter
//   POST   /api/mod/commenter/:hash/unban    — lift ban
//   PUT    /api/mod/notes/:id                — edit note
//   DELETE /api/mod/notes/:id                — delete note
//
// :hash is always a 64-char lowercase hex string (SHA-256 ip_hash).
// :id   is always a positive integer (mod_notes.id).
// ============================================================

import { requireMod }                from '../middleware/auth.js';
import { validatePaginationParams }  from '../middleware/validation.js';
import { validateNoteBody, validateNoteCategory } from '../middleware/validation.js';
import { logModAction }              from '../db/audit.js';
import {
  getCommenterStats,
  getCommenterProfile,
  upsertBanState,
  getFingerprints,
  getFingerprintCount,
  getCommenterHistory,
  getCommenterCommentCount,
  getNotes,
  getNoteCount,
  getNoteById,
  insertNote,
  updateNote,
  deleteNote,
} from '../db/mod_queries.js';
import { MOD_ACTIONS } from '../config/constants.js';
import { jsonOk, jsonError } from './response.js';

// ── Path patterns ─────────────────────────────────────────────────────────────
// ip_hash is 64 lowercase hex chars (SHA-256 output).
const HASH_RE  = /^[a-f0-9]{64}$/;
const NOTE_ID_RE = /^\d+$/;

function parseModPath(path, method) {
  // /api/mod/commenter/:hash
  const commenterBase = path.match(/^\/api\/mod\/commenter\/([a-f0-9]{64})$/);
  if (commenterBase) return { route: 'commenter', hash: commenterBase[1] };

  // /api/mod/commenter/:hash/history
  const historyPath = path.match(/^\/api\/mod\/commenter\/([a-f0-9]{64})\/history$/);
  if (historyPath) return { route: 'history', hash: historyPath[1] };

  // /api/mod/commenter/:hash/notes
  const notesPath = path.match(/^\/api\/mod\/commenter\/([a-f0-9]{64})\/notes$/);
  if (notesPath) return { route: 'notes', hash: notesPath[1] };

  // /api/mod/commenter/:hash/ban
  const banPath = path.match(/^\/api\/mod\/commenter\/([a-f0-9]{64})\/ban$/);
  if (banPath) return { route: 'ban', hash: banPath[1] };

  // /api/mod/commenter/:hash/unban
  const unbanPath = path.match(/^\/api\/mod\/commenter\/([a-f0-9]{64})\/unban$/);
  if (unbanPath) return { route: 'unban', hash: unbanPath[1] };

  // /api/mod/notes/:id
  const noteById = path.match(/^\/api\/mod\/notes\/(\d+)$/);
  if (noteById) return { route: 'note_by_id', id: parseInt(noteById[1], 10) };

  return null;
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function handleMod(request, env, path) {
  // ── Auth gate — checked before any DB access ─────────────────
  const auth = requireMod(request, env);
  if (!auth.authorized) return jsonError(auth.error, 401);

  const method  = request.method.toUpperCase();
  const parsed  = parseModPath(path, method);

  if (!parsed) return jsonError('Not found.', 404);

  try {
    switch (parsed.route) {
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

// ── GET /api/mod/commenter/:hash ─────────────────────────────────────────────
// Returns live stats + ban state + note/fingerprint counts in one round-trip.
// All four sub-queries run in parallel via Promise.all.

async function handleGetProfile(db, ipHash) {
  const [stats, profile, noteCount, fpCount] = await Promise.all([
    getCommenterStats(db, ipHash),
    getCommenterProfile(db, ipHash),
    getNoteCount(db, ipHash),
    getFingerprintCount(db, ipHash),
  ]);

  return jsonOk({
    ip_hash: ipHash,
    stats,
    profile: profile
      ? {
          is_banned:  Boolean(profile.is_banned),
          ban_reason: profile.ban_reason,
          banned_at:  profile.banned_at,
          banned_by:  profile.banned_by,
          created_at: profile.created_at,
        }
      : {
          is_banned:  false,
          ban_reason: null,
          banned_at:  null,
          banned_by:  null,
          created_at: null,
        },
    note_count:        noteCount,
    fingerprint_count: fpCount,
  });
}

// ── GET /api/mod/commenter/:hash/history ──────────────────────────────────────
// Paginated list of all comments by this commenter (all statuses, all fields).

async function handleGetHistory(request, db, ipHash) {
  const url = new URL(request.url);
  const { limit, offset } = validatePaginationParams(
    url.searchParams.get('limit'),
    url.searchParams.get('page'),
  );

  const [comments, total] = await Promise.all([
    getCommenterHistory(db, ipHash, limit, offset),
    getCommenterCommentCount(db, ipHash),
  ]);

  return jsonOk({
    ip_hash: ipHash,
    total,
    page:     Math.floor(offset / limit) + 1,
    limit,
    comments,
  });
}

// ── GET /api/mod/commenter/:hash/notes ────────────────────────────────────────

async function handleGetNotes(db, ipHash) {
  const notes = await getNotes(db, ipHash);
  return jsonOk({ ip_hash: ipHash, notes });
}

// ── POST /api/mod/commenter/:hash/notes ───────────────────────────────────────

async function handleAddNote(request, env, ipHash) {
  let body;
  try { body = await request.json(); } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const { body: noteBody, category } = body;

  const bodyCheck = validateNoteBody(noteBody);
  if (!bodyCheck.valid) return jsonError(bodyCheck.error, 400);

  const catCheck = validateNoteCategory(category);
  if (!catCheck.valid) return jsonError(catCheck.error, 400);

  // Infer moderator identity from the token itself.
  // Phase 3 can replace this with a real session lookup.
  const moderator = 'moderator';

  const id = await insertNote(env.DB, ipHash, moderator, bodyCheck.value, catCheck.value);

  await logModAction(env.DB, {
    moderator,
    action:     MOD_ACTIONS.ADD_NOTE,
    commentId:  null,
    reviewSlug: null,
    reason:     `Note #${id} added [${catCheck.value}]`,
  });

  return jsonOk({ id, message: 'Note added.' }, 201);
}

// ── POST /api/mod/commenter/:hash/ban ─────────────────────────────────────────

async function handleBan(request, env, ipHash) {
  let body;
  try { body = await request.json(); } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const reason    = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : null;
  const moderator = 'moderator';

  await upsertBanState(env.DB, ipHash, {
    isBanned:  true,
    banReason: reason || null,
    bannedBy:  moderator,
  });

  await logModAction(env.DB, {
    moderator,
    action:  MOD_ACTIONS.BAN,
    reason:  reason || null,
  });

  return jsonOk({ message: 'Commenter banned.' });
}

// ── POST /api/mod/commenter/:hash/unban ───────────────────────────────────────

async function handleUnban(request, env, ipHash) {
  const moderator = 'moderator';

  await upsertBanState(env.DB, ipHash, {
    isBanned:  false,
    banReason: null,
    bannedBy:  null,
  });

  await logModAction(env.DB, {
    moderator,
    action: MOD_ACTIONS.UNBAN,
  });

  return jsonOk({ message: 'Ban lifted.' });
}

// ── PUT /api/mod/notes/:id ────────────────────────────────────────────────────

async function handleUpdateNote(request, env, noteId) {
  let body;
  try { body = await request.json(); } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const note = await getNoteById(env.DB, noteId);
  if (!note) return jsonError('Note not found.', 404);

  const bodyCheck = validateNoteBody(body?.body);
  if (!bodyCheck.valid) return jsonError(bodyCheck.error, 400);

  const catCheck = validateNoteCategory(body?.category ?? note.category);
  if (!catCheck.valid) return jsonError(catCheck.error, 400);

  await updateNote(env.DB, noteId, bodyCheck.value, catCheck.value);

  const moderator = 'moderator';
  await logModAction(env.DB, {
    moderator,
    action: MOD_ACTIONS.EDIT_NOTE,
    reason: `Note #${noteId} edited`,
  });

  return jsonOk({ message: 'Note updated.' });
}

// ── DELETE /api/mod/notes/:id ─────────────────────────────────────────────────

async function handleDeleteNote(request, env, noteId) {
  const note = await getNoteById(env.DB, noteId);
  if (!note) return jsonError('Note not found.', 404);

  await deleteNote(env.DB, noteId);

  const moderator = 'moderator';
  await logModAction(env.DB, {
    moderator,
    action: MOD_ACTIONS.DELETE_NOTE,
    reason: `Note #${noteId} deleted [was: ${note.category}]`,
  });

  return jsonOk({ message: 'Note deleted.' });
}
