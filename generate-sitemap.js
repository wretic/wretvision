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

const BASE = 'https://wretvision.com';

const staticPages = [
  { url: BASE + '/',                   priority: '1.0', changefreq: 'weekly'  },
  { url: BASE + '/index.html',         priority: '1.0', changefreq: 'weekly'  },
  { url: BASE + '/movies.html',        priority: '0.9', changefreq: 'weekly'  },
  { url: BASE + '/tv.html',            priority: '0.9', changefreq: 'weekly'  },
  { url: BASE + '/games.html',         priority: '0.9', changefreq: 'weekly'  },
  { url: BASE + '/horror-vault.html',  priority: '0.8', changefreq: 'weekly'  },
];

// ?id= uses a numeric id — no special XML escaping needed for digits
const reviewPages = reviews.map(r => ({
  url:        BASE + '/review.html?id=' + r.id,
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
