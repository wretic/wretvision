const fs = require('fs');

const raw = fs.readFileSync('reviews.js', 'utf8');
const match = raw.match(/const REVIEWS\s*=\s*(\[[\s\S]*?\]);?\s*$/m);
if (!match) { console.error('Could not parse reviews.js'); process.exit(1); }

const reviews = JSON.parse(match[1]);

const staticPages = [
  { url: 'https://wretvision.com/index.html',        priority: '1.0' },
  { url: 'https://wretvision.com/movies.html',        priority: '0.9' },
  { url: 'https://wretvision.com/tv.html',            priority: '0.9' },
  { url: 'https://wretvision.com/games.html',         priority: '0.9' },
  { url: 'https://wretvision.com/horror-vault.html',  priority: '0.8' },
];

const reviewPages = reviews.map(function (r) {
  return { url: 'https://wretvision.com/review.html?id=' + r.id, priority: '0.7' };
});

const all = staticPages.concat(reviewPages);

const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + all.map(function (p) {
      return '  <url>\n'
           + '    <loc>' + p.url + '</loc>\n'
           + '    <changefreq>weekly</changefreq>\n'
           + '    <priority>' + p.priority + '</priority>\n'
           + '  </url>';
    }).join('\n')
  + '\n</urlset>\n';

fs.writeFileSync('sitemap.xml', xml);
console.log('Sitemap generated: ' + all.length + ' URLs (' + reviews.length + ' reviews)');
