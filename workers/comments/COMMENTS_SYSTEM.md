# WretVision Comments System

## Architecture Overview

Static Cloudflare Pages site + Cloudflare Worker backend + D1 (SQLite) database.
Review pages remain fully cached. Comments load dynamically from `/api/comments/*`.

---

## Phase History

| Phase | Status | Description |
|-------|--------|-------------|
| 1.0   | Complete | Core architecture: D1 schema, GET/POST/report endpoints, Turnstile, rate limiting, spam detection, reserved usernames |
| 1.1   | Complete | Hardening: dual-signal rate limiting, impersonation-resistant username blocking, audit log, revision history, vote schema, shadow moderation schema, spoiler architecture |
| 1.2   | Complete | Moderator intelligence: commenter profiles, fingerprint linking, mod notes, moderation history, moderator dashboard API, ban/unban |
| 2     | Planned | Frontend comment UI on review.html, click-to-reveal spoilers, per-author shadow visibility |
| 3     | Planned | Moderation dashboard UI, approve/reject queue, revision history viewer, full mod action implementation |
| 4     | Planned | Vote system (upvote/downvote), user accounts |

**Backend is feature-complete after Phase 1.2.** Phase 2+ is purely frontend and dashboard work.

---

## Database Schema

### `comments`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| review_slug | TEXT | Matches reviews.js slug field |
| parent_id | INTEGER FK | NULL = top-level. Non-null = reply. Schema supports deep nesting; API enforces max 1 level |
| display_name | TEXT | Commenter-chosen name. Not an account |
| body | TEXT | Sanitized (HTML stripped) before storage |
| status | TEXT | `pending` / `approved` / `rejected` |
| is_pinned | INTEGER | 0/1. Pinned comments sort to the top |
| is_spoiler | INTEGER | 0/1. Click-to-reveal on frontend (Phase 2) |
| is_deleted | INTEGER | 0/1. Soft delete — body replaced with `[deleted]` on output |
| is_locked | INTEGER | 0/1. Prevents new replies to this comment |
| is_edited | INTEGER | 0/1. Set to 1 on first edit. Public sees "Edited" label only |
| shadow_hidden | INTEGER | 0/1. See Shadow Moderation section |
| report_count | INTEGER | Running total. Never sent to client |
| ip_hash | TEXT | SHA-256(OWNER_TOKEN:ip). Never raw IP |
| created_at | TEXT | ISO-8601 UTC |
| updated_at | TEXT | ISO-8601 UTC |

### `comment_revisions`

Stores every version of a comment body. Revision 1 is always the original text at post time.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| comment_id | INTEGER FK | → comments.id (CASCADE DELETE) |
| body | TEXT | Full body text at this revision |
| edited_by | TEXT | `user` or `moderator` |
| created_at | TEXT | When this revision was saved |

**Public access:** None. Only `is_edited` flag is public.
**Moderator access:** Phase 3 dashboard will expose full history per comment.

### `reports`

One row per IP per comment. `UNIQUE(comment_id, ip_hash)` prevents duplicates.
Auto-reject triggered when `report_count >= 5` (configurable in `constants.js`).

### `mod_audit_log`

Every moderator action, manual or automated. **Never exposed via public API.**

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| moderator | TEXT | `system` for automated, owner username in Phase 3 |
| action | TEXT | See MOD_ACTIONS in constants.js |
| comment_id | INTEGER FK | Nullable (for account-level actions) |
| review_slug | TEXT | Copied at log time — survives comment deletion |
| prev_status | TEXT | Status before the action |
| new_status | TEXT | Status after the action |
| reason | TEXT | Optional free-text from moderator |
| created_at | TEXT | |

**Supported actions:** `approve`, `reject`, `hide`, `restore`, `delete`, `pin`, `unpin`, `lock`, `unlock`, `spoiler`, `unspoiler`, `shadow_hide`, `shadow_restore`, `ban`, `unban`, `auto_reject`

### `rate_log`

Lightweight flood protection log. Pruned on every write.

**What is stored:**
- `ip_hash` — SHA-256(OWNER_TOKEN:ip)
- `fingerprint_hash` — SHA-256(ip|user-agent|accept-language|client-hints)
- `action` — `post` or `report`
- `created_at`

**What is NOT stored:** Raw IP address, raw User-Agent string, cookies, or any personally identifiable information.

### `votes` (Phase 4 — schema only, no API)

Future vote table. See Vote Architecture section.

---

## Rate Limiting

### Dual-Signal Approach

Every POST endpoint checks two independent rate-limit signals:

1. **IP hash** — catches repeated requests from the same IP directly.
2. **Fingerprint hash** — catches the same person rotating IPs (VPN switching, mobile carrier NAT).

A request is rejected if **either** signal exceeds the limit. Neither alone can be gamed.

### Fingerprint Composition

SHA-256 of: `ip | user-agent | accept-language | sec-ch-ua | sec-ch-ua-platform | sec-ch-ua-mobile`

- Fields are concatenated with `|` delimiters to prevent value bleeding.
- Client Hints (`Sec-CH-UA-*`) are available on Chromium-based browsers automatically.
- Firefox/Safari do not send Client Hints — their fingerprint still includes IP + UA + language.
- The raw header values are **never stored** — only the hash.

### Limits

| Action | Max | Window |
|--------|-----|--------|
| post comment | 3 | 10 minutes |
| report comment | 5 | 1 hour |

Configurable in `src/config/constants.js`.

---

## Reserved Username System

### Two-Tier Blocking

**Tier 1 — Branded terms** (substring match after normalization):
- `wretvision`, `wretic`
- Blocked if the normalized name **contains** either term
- Catches: `OfficialWretVision`, `RealWretVision`, `WretVisionTV`, `WreticOfficial`, `Wr3tVision`

**Tier 2 — Role terms** (exact match after normalization):
- `admin`, `administrator`, `moderator`, `mod`, `owner`, `editor`, `staff`, `support`, `official`, `system`
- Blocked on exact match only to avoid false positives (`modification` ≠ `mod`)

### Normalization Pipeline

Applied before any check:
1. Lowercase
2. Unicode homoglyphs → ASCII (Cyrillic а/е/і/о, Greek ο, small-caps letters)
3. Leet: `0→o 1→i 3→e 4→a 5→s 7→t 8→b $→s @→a`
4. Strip zero-width characters (invisible Unicode spoofing)
5. Remove all non-alphanumeric characters (`_`, `-`, `.`, spaces, etc.)

### Examples

| Input | Normalized | Blocked? | Reason |
|-------|------------|----------|--------|
| WretVision | wretvision | Yes | branded (exact) |
| OfficialWretVision | officialwretvision | Yes | branded (contains) |
| RealWretVision | realwretvision | Yes | branded (contains) |
| WretVisionTV | wretvisiontv | Yes | branded (contains) |
| Wr3tVision | wretvision | Yes | leet normalized |
| WretVision__ | wretvision | Yes | separators stripped |
| WreticOfficial | wreticofficial | Yes | branded (contains) |
| admin | admin | Yes | role (exact) |
| Admin_123 | admin123 | No | not exact role match |
| modification | modification | No | does not contain role terms |
| MovieFan99 | moviefan99 | No | allowed |

---

## Spoiler System

### Current State (Phase 1.1)

`is_spoiler` flag exists on comments and is returned to the client. The API enforces nothing further — spoiler marking is self-declared by the commenter.

### Phase 2 Behaviour

The frontend will render spoiler comments like this:

```
┌────────────────────────────────────┐
│  ⚠ Spoiler — click to reveal       │
│  ██████████████████████████████    │  ← blurred/hidden
└────────────────────────────────────┘
         ↓ user clicks
┌────────────────────────────────────┐
│  [Full comment text visible]       │
└────────────────────────────────────┘
```

**Implementation:** CSS `filter: blur()` + JavaScript click handler. No separate API call needed. The body text is in the response — the frontend hides it. This is especially important for movie/TV/game discussion threads where spoilers are expected and welcome but should be opt-in.

**No permanent blur.** Once revealed, the comment stays visible for the session. The blur is a gate, not a censor.

---

## Shadow Moderation

### Purpose

Suppress spam or abusive users without alerting them that they have been banned. When a commenter is shadow-hidden:
- Their comment appears to submit normally
- They can see it in their own browser (Phase 2)
- All other users see nothing

This prevents spammers from simply creating new accounts or changing approach when they detect a ban.

### Current State (Phase 1.1)

`shadow_hidden` column exists. The GET handler excludes all shadow-hidden comments with `AND shadow_hidden = 0`. No public API exposes this field.

### Phase 2 Implementation

The GET handler will receive the requester's IP hash and change the filter:

```sql
-- Current (Phase 1.1):
AND shadow_hidden = 0

-- Phase 2:
AND (shadow_hidden = 0 OR ip_hash = ?)  -- ? = requester IP hash
```

The requester sees their own shadow-hidden comment. Everyone else sees nothing.

### Applying Shadow Hide (Phase 3)

Moderator action in the dashboard sets `shadow_hidden = 1` and logs to `mod_audit_log` with action `shadow_hide`. Reversal is `shadow_restore`.

---

## Vote Architecture (Phase 4)

### Schema

The `votes` table exists but has **zero API endpoints**. No migration needed when Phase 4 is built.

```sql
votes(comment_id, ip_hash, value, created_at, updated_at)
-- value: 1 = upvote, -1 = downvote
-- UNIQUE(comment_id, ip_hash) — one record per IP per comment, updated in place
```

### Intended Phase 4 Behaviour

- `GET /api/comments` — add `vote_score` to each comment (derived: `SUM(value)`)
- `POST /api/votes` — upsert a vote (Turnstile required)
- Downvotes may be disabled — TBD
- Vote counts use `SUM(value)` not a denormalized column to avoid write contention

### Why not store score on the comment row?

High-traffic reviews could trigger hundreds of simultaneous `UPDATE comments SET vote_count = vote_count + 1` statements, causing SQLite write locks. Computing from the `votes` table at read time is safer at this scale.

---

## Security

### What is stored
| Data | Form stored |
|------|-------------|
| Commenter IP | SHA-256(OWNER_TOKEN + ":" + ip) — non-reversible |
| Rate limit fingerprint | SHA-256(ip + UA + lang + client hints) — non-reversible |
| Comment body | HTML-stripped plain text |
| Display name | HTML-stripped plain text |

### What is never stored
- Raw IP addresses
- Raw User-Agent strings
- Cookies or session data
- Passwords (no accounts in Phase 1/2)

### XSS Prevention
- Input: `stripHTML()` removes all tags before storage
- Output: `escapeHTML()` escapes `& < > " '` before sending to client

### Injection Prevention
- All SQL uses parameterized queries (`db.prepare(...).bind(...)`)
- No string interpolation in query values

### Origin Locking
- Production worker rejects requests where `Origin` is not `https://wretvision.com`
- Controlled by `CORS_ORIGIN` env var in `wrangler.toml`

---

## Performance

### Indexes
| Index | Purpose |
|-------|---------|
| `idx_comments_slug_status` | Primary read path — approved, non-deleted, non-shadow-hidden comments for a slug |
| `idx_comments_parent` | Reply fetching |
| `idx_comments_pending` | Moderation queue (partial index on `status = 'pending'`) |
| `idx_comments_pinned` | Pinned comment bubble-up (partial index on `is_pinned = 1`) |
| `idx_rate_log_ip` | Per-IP rate limit check |
| `idx_rate_log_fingerprint` | Per-fingerprint rate limit check (partial index on non-null) |
| `idx_reports_comment` | Report deduplication |
| `idx_audit_comment` | Audit log per comment (Phase 3) |
| `idx_audit_moderator` | Audit log per moderator (Phase 3) |
| `idx_revisions_comment` | Revision history per comment (Phase 3) |

### Page Cache
Review pages stay at full Cloudflare CDN cache TTL. Comments load from `/api/comments/*` which bypasses the page cache entirely — no cache purge needed when a comment is approved.

### Performance expectations (Phase 1.2 additions)

All mod endpoints operate on small, indexed datasets:

| Endpoint | Queries | Index used | Expected latency |
|----------|---------|-----------|-----------------|
| GET /api/mod/commenter/:hash | 4 parallel | `idx_comments_ip_hash`, profile PK, `idx_mod_notes_ip`, `idx_fp_ip` | <5ms |
| GET /api/mod/commenter/:hash/history | 2 parallel | `idx_comments_ip_hash` | <3ms |
| GET /api/mod/commenter/:hash/notes | 1 | `idx_mod_notes_ip` | <2ms |
| POST /api/mod/commenter/:hash/notes | 2 sequential | PK insert + audit insert | <5ms |
| POST /api/mod/commenter/:hash/ban | 2 sequential | PK upsert + audit insert | <5ms |

No N+1 queries anywhere. The profile endpoint runs all four sub-queries with `Promise.all`. At WretVision scale (<50k total comments ever), all queries are sub-millisecond at the DB layer.

---

## Moderator API (Phase 1.2)

### Authentication

All `/api/mod/*` routes require:
```
Authorization: Bearer <OWNER_TOKEN>
```

`OWNER_TOKEN` is set via `wrangler secret put OWNER_TOKEN`. The same token is used as the IP hash salt — do not rotate it unless rebuilding all ip_hash values in the database.

Origin locking is **not applied** to mod routes since they are called from the dashboard (not from the site's Origin). Mod endpoints must never be linked from public pages.

### Endpoint Reference

#### `GET /api/mod/commenter/:hash`
Returns commenter profile + live stats in one response. All four sub-queries run in parallel.

```json
{
  "ip_hash": "abc123...",
  "stats": {
    "total": 15,
    "approved": 10,
    "pending": 2,
    "rejected": 3,
    "deleted": 1,
    "shadow_hidden": 0,
    "total_reports_received": 4,
    "first_comment_at": "2026-01-15T10:30:00Z",
    "last_comment_at": "2026-07-19T14:22:00Z"
  },
  "profile": {
    "is_banned": false,
    "ban_reason": null,
    "banned_at": null,
    "banned_by": null,
    "created_at": null
  },
  "note_count": 2,
  "fingerprint_count": 1
}
```

#### `GET /api/mod/commenter/:hash/history?page=1&limit=20`
Paginated list of all comments by this commenter across all statuses. Includes internal fields (`status`, `shadow_hidden`, `report_count`) not sent in public responses.

#### `GET /api/mod/commenter/:hash/notes`
All moderator notes for this commenter.

```json
{
  "ip_hash": "abc123...",
  "notes": [
    {
      "id": 1,
      "moderator": "moderator",
      "body": "Posted spoilers without marking them twice.",
      "category": "spoilers",
      "created_at": "2026-07-19T14:22:00Z",
      "updated_at": "2026-07-19T14:22:00Z"
    }
  ]
}
```

#### `POST /api/mod/commenter/:hash/notes`
Add a new note. Notes are never overwritten — this always creates a new record.

```json
{ "body": "Repeated spam attempts.", "category": "spam" }
```

Valid categories: `spam`, `spoilers`, `abuse`, `general`

#### `POST /api/mod/commenter/:hash/ban`
Ban a commenter. Creates or updates the `commenter_profiles` row. Logs to audit log.

```json
{ "reason": "Persistent spam after two warnings." }
```

#### `POST /api/mod/commenter/:hash/unban`
Lift a ban. Clears ban fields. Logs to audit log.

#### `PUT /api/mod/notes/:id`
Edit an existing note body and/or category.

```json
{ "body": "Updated note text.", "category": "abuse" }
```

#### `DELETE /api/mod/notes/:id`
Permanently delete a note. Logged to audit log with note ID and category.

### New Tables (Phase 1.2)

#### `commenter_profiles`
One row per ip_hash. Created lazily on first ban or when first note is added. Only stores non-derivable data — stats are always computed live from `comments`.

| Column | Description |
|--------|-------------|
| ip_hash | PK — SHA-256 hash |
| is_banned | Ban flag |
| ban_reason | Optional free-text reason |
| banned_at | Timestamp of ban |
| banned_by | Moderator who issued ban |

#### `commenter_fingerprints`
Maps ip_hash ↔ fingerprint_hash associations. Updated on every comment submission so `last_seen_at` stays current. Used to detect ban evasion (same device fingerprint, changed IP).

Reverse lookup (`idx_fp_fingerprint`): given a fingerprint, find all ip_hashes that have ever used it.

#### `mod_notes`
Internal notes per commenter. Multiple notes allowed. Notes are never overwritten — add creates a new row, edit updates `body`/`category`/`updated_at`. All note CRUD is logged in `mod_audit_log`.

### Security Model

| Concern | Mitigation |
|---------|-----------|
| Unauthorized access | Bearer token required on every request, checked before any DB access |
| Token brute-force | Cloudflare rate-limits and DDoS-protects the Worker; all requests go through CF network |
| Data exposure | Mod endpoints return full internal fields (status, shadow_hidden, ip_hash) — never reachable without token |
| Note content | Notes are internal — never included in public GET /api/comments responses |
| Audit trail | Every mod action (including note CRUD) appended to mod_audit_log, permanent record |

### Privacy Considerations

- `commenter_profiles` stores only hashes, ban metadata, and timestamps. No PII.
- `commenter_fingerprints` stores only hashes. No raw UA, no raw IP.
- The `:hash` in mod URLs is the SHA-256 ip_hash — non-reversible. A moderator who has the hash cannot recover the original IP.
- Notes may contain moderator-written text about behaviour patterns — this is internal data and must remain internal.

### Future Workflow (Phase 3)

1. Moderator opens dashboard and sees the pending queue.
2. Clicks a comment → sees commenter profile sidebar: total history, ban status, existing notes.
3. Approves, rejects, or shadow-hides the comment (logged to mod_audit_log).
4. Optionally adds a note: "First offence, warned about spoilers."
5. If pattern repeats → bans the commenter.
6. Ban evasion check: dashboard shows fingerprint count. If same fingerprint appears on a new ip_hash, that's an evader.

---

## Local Setup

```bash
cd workers/comments

# 1. Install dependencies
npm install

# 2. Create D1 database
wrangler d1 create wretvision-comments

# 3. Update wrangler.toml — paste the database_id from step 2

# 4. Run schema (fresh install — includes all phases)
npm run db:init

# If upgrading an existing Phase 1.1 database:
npm run db:migrate:1.2

# 5. Set secrets
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put OWNER_TOKEN

# 6. Test locally
npm run dev
```

---

## Deployment

Not yet deployed. Pending local testing sign-off.
Branch: `feat/comments-phase-1`

Do not deploy until:
- [ ] `wrangler dev` runs without errors
- [ ] GET /api/comments returns expected JSON
- [ ] POST /api/comments passes Turnstile + rate limit + spam checks
- [ ] POST /api/comments/report handles duplicate reports correctly
- [ ] Reserved username blocking tested against impersonation examples
- [ ] GET /api/mod/* returns 401 without valid token
- [ ] GET /api/mod/* returns 401 with wrong token
- [ ] GET /api/mod/commenter/:hash returns stats + profile
- [ ] POST /api/mod/commenter/:hash/notes adds note, visible in GET
- [ ] POST /api/mod/commenter/:hash/ban + unban cycle works
- [ ] mod_audit_log records all actions above
- [ ] No regressions in existing public comment API
