const fs = require('fs');
const vm = require('vm');

// Execute reviews.js in a sandboxed context.
// const/let don't attach to the sandbox, so replace them with var first.
const raw = fs.readFileSync('reviews.js', 'utf8');
const normalized = raw.replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');
const sandbox = {};
vm.createContext(sandbox);
try {
  vm.runInContext(normalized, sandbox);
} catch (e) {
  console.error('Could not execute reviews.js:', e.message);
  process.exit(1);
}

const reviews = sandbox.REVIEWS;
if (!Array.isArray(reviews)) {
  console.error('REVIEWS is not an array — check reviews.js');
  process.exit(1);
}

// ── Validation ───────────────────────────────────────────────────────────────

const missingSlugs = reviews.filter(r => !r.slug);
if (missingSlugs.length > 0) {
  console.warn('WARNING: ' + missingSlugs.length + ' review(s) missing a slug field:');
  missingSlugs.forEach(r => console.warn('  - ' + r.title + ' (id=' + r.id + ')'));
}

const slugCount = {};
reviews.forEach(r => {
  if (r.slug) slugCount[r.slug] = (slugCount[r.slug] || 0) + 1;
});
const duplicateSlugs = Object.entries(slugCount).filter(([, n]) => n > 1);
if (duplicateSlugs.length > 0) {
  console.error('ERROR: Duplicate slugs detected — fix before deploying:');
  duplicateSlugs.forEach(([slug, n]) => console.error('  - "' + slug + '" used by ' + n + ' reviews'));
  process.exit(1);
}

// ── Build sitemap ─────────────────────────────────────────────────────────────

const BASE = 'https://wretvision.com';

const staticPages = [
  { url: BASE + '/',                   priority: '1.0', changefreq: 'weekly'  },
  { url: BASE + '/index.html',         priority: '1.0', changefreq: 'weekly'  },
  { url: BASE + '/movies.html',        priority: '0.9', changefreq: 'weekly'  },
  { url: BASE + '/tv.html',            priority: '0.9', changefreq: 'weekly'  },
  { url: BASE + '/games.html',         priority: '0.9', changefreq: 'weekly'  },
  { url: BASE + '/horror-vault.html',  priority: '0.8', changefreq: 'weekly'  },
];

// Slug URLs in sitemap; fall back to id URL only if slug is missing
const reviewPages = reviews.map(r => ({
  url: BASE + '/review.html?' + (r.slug ? 'slug=' + r.slug : 'id=' + r.id),
  priority:   '0.7',
  changefreq: 'monthly',
}));

const all = staticPages.concat(reviewPages);

const urlEntries = all.map(p =>
  '  <url>\n'
  + '    <loc>' + p.url + '</loc>\n'
  + '    <changefreq>' + p.changefreq + '</changefreq>\n'
  + '    <priority>' + p.priority + '</priority>\n'
  + '  </url>'
).join('\n');

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urlEntries + '\n'
  + '</urlset>\n';

fs.writeFileSync('sitemap.xml', xml);
console.log('Sitemap written: ' + all.length + ' URLs (' + reviews.length + ' reviews + ' + staticPages.length + ' static)');
