/**
 * add-slugs.js
 * One-shot script: reads reviews.js, injects a "slug" field into every
 * review object that is missing one, then writes the file back in place.
 *
 * Run: node scripts/add-slugs.js
 */

'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const REVIEWS_JS = path.join(__dirname, '..', 'reviews.js');

// ── slug generation ──────────────────────────────────────────────────────────

function toSlug(title) {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // strip everything except letters, digits, spaces, hyphens
    .trim()
    .replace(/[\s-]+/g, '-')        // collapse runs of whitespace/hyphens to a single hyphen
    .replace(/^-|-$/g, '');         // strip leading/trailing hyphens

  if (!slug.endsWith('-review')) {
    slug += '-review';
  }
  return slug;
}

// ── load and parse ───────────────────────────────────────────────────────────

const raw = fs.readFileSync(REVIEWS_JS, 'utf8');
const norm = raw.replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(norm, sandbox);

const reviews = sandbox.REVIEWS;
if (!Array.isArray(reviews)) {
  console.error('REVIEWS not found in reviews.js');
  process.exit(1);
}

// ── assign slugs ─────────────────────────────────────────────────────────────

const usedSlugs = new Set();

// First pass: register slugs that already exist
for (const r of reviews) {
  if (r.slug) usedSlugs.add(r.slug);
}

// Second pass: generate missing slugs
const newSlugs = [];   // { id, slug }

for (const r of reviews) {
  if (r.slug) continue;

  let base = toSlug(r.title);

  // Duplicate? → try appending year
  if (usedSlugs.has(base)) {
    base = toSlug(r.title + ' ' + r.year);
  }

  // Still a duplicate? → append counter
  let final = base;
  let counter = 2;
  while (usedSlugs.has(final)) {
    final = base + '-' + counter;
    counter++;
  }

  usedSlugs.add(final);
  newSlugs.push({ id: r.id, slug: final });
  console.log('  ' + r.title + ' (' + r.year + ')  →  ' + final);
}

if (newSlugs.length === 0) {
  console.log('All reviews already have slugs — nothing to do.');
  process.exit(0);
}

// ── inject into source file ───────────────────────────────────────────────────
// Strategy: for each (id, slug) pair, locate the line containing `"id": ID`
// (or `id: ID`), detect its indentation, then insert a "slug": "..." line
// immediately after it.

let source = raw;

// Process in reverse order of occurrence so that earlier injections
// don't shift the indices of later ones.
// Sort by index descending.
const insertions = [];

for (const { id, slug } of newSlugs) {
  // Match both quoted ("id": 123) and unquoted (id: 123) key styles
  const pattern = new RegExp('("id"|id)\\s*:\\s*' + id + '(?!\\d)');
  const match = pattern.exec(source);
  if (!match) {
    console.warn('WARNING: could not find id ' + id + ' in source — skipping');
    continue;
  }

  const matchIdx = match.index;
  const lineStart = source.lastIndexOf('\n', matchIdx) + 1;
  // Detect the indentation of this line
  const indent = source.slice(lineStart, matchIdx).match(/^(\s*)/)[1];
  const lineEnd = source.indexOf('\n', matchIdx);

  insertions.push({ pos: lineEnd, indent, slug });
}

// Apply insertions from last to first (so positions remain valid)
insertions.sort((a, b) => b.pos - a.pos);

for (const { pos, indent, slug } of insertions) {
  const line = '\n' + indent + '"slug": "' + slug + '",';
  source = source.slice(0, pos) + line + source.slice(pos);
}

fs.writeFileSync(REVIEWS_JS, source, 'utf8');
console.log('\nDone — injected ' + newSlugs.length + ' slug(s) into reviews.js');
