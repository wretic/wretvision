const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const scheduledFile = path.join(rootDir, 'data', 'scheduled_reviews.json');
const reviewsFile = path.join(rootDir, 'reviews.js');

if (!fs.existsSync(scheduledFile)) {
  console.log('No scheduled_reviews.json found. Exiting.');
  process.exit(0);
}

const rawScheduled = fs.readFileSync(scheduledFile, 'utf8').trim();
if (!rawScheduled) {
  console.log('scheduled_reviews.json is empty. Exiting.');
  process.exit(0);
}

let scheduledList;
try {
  scheduledList = JSON.parse(rawScheduled);
} catch (e) {
  console.error('Failed to parse scheduled_reviews.json:', e);
  process.exit(1);
}

if (!Array.isArray(scheduledList) || scheduledList.length === 0) {
  console.log('No scheduled reviews in array. Exiting.');
  process.exit(0);
}

console.log(`Publishing ${scheduledList.length} scheduled review(s)...`);

let reviewsJs = fs.readFileSync(reviewsFile, 'utf8');
const isCrlf = reviewsJs.includes('\r\n');
const newline = isCrlf ? '\r\n' : '\n';
const target = `const REVIEWS = [${newline}`;

if (!reviewsJs.includes(target)) {
  console.error('Could not find "const REVIEWS = [" in reviews.js');
  process.exit(1);
}

// Convert each review object to formatted JSON with 4-space indent
const formattedEntries = scheduledList.map(item => {
  const jsonStr = JSON.stringify(item, null, 4);
  return jsonStr.split(/\r?\n/).map(line => '    ' + line).join(newline);
}).join(',' + newline) + ',' + newline;

reviewsJs = reviewsJs.replace(target, target + formattedEntries);

fs.writeFileSync(reviewsFile, reviewsJs, 'utf8');
console.log('Successfully injected scheduled reviews into reviews.js');

// Clear scheduled_reviews.json
fs.writeFileSync(scheduledFile, '[]\n', 'utf8');
console.log('Cleared scheduled_reviews.json');
