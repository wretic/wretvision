// ============================================================
// WRETVISION — SHARED ENGINE
// Used by index.html, movies.html, tv.html, games.html
// ============================================================

const REVIEWS_PER_PAGE = 5;

let currentFilter   = 'all';
let currentPage     = 1;
let activeCategory  = 'all'; // set by each page on load

// ── HELPERS ──────────────────────────────────────────────────
function buildRatingBlocks(score) {
  let html = '';
  for (let i = 1; i <= 10; i++) {
    html += `<span class="rating-block${i > score ? ' empty' : ''}"></span>`;
  }
  html += `<span class="rating-score">${score}/10</span>`;
  return html;
}

function pixelCorners() {
  return `<div class="pixel-corner pc-tl"></div><div class="pixel-corner pc-tr"></div><div class="pixel-corner pc-bl"></div><div class="pixel-corner pc-br"></div>`;
}

// ── GET REVIEWS FOR THIS PAGE'S CATEGORY ─────────────────────
function getCategoryReviews() {
  if (activeCategory === 'all') return REVIEWS;
  return REVIEWS.filter(r => r.category === activeCategory);
}

// ── FILTERING ────────────────────────────────────────────────
function getFilteredReviews() {
  const base = getCategoryReviews();
  if (currentFilter === 'all') return base;
  return base.filter(r => r.genres.includes(currentFilter));
}

function applyFilter(genre) {
  currentFilter = genre;
  currentPage   = 1;
  render();
  document.querySelectorAll('.filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === genre));
  document.querySelectorAll('.genre-tag').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === genre));
}

// ── BUILD FILTER BAR ─────────────────────────────────────────
function buildFilterBar() {
  const bar    = document.getElementById('filter-bar');
  const genres = getAllGenres();
  bar.innerHTML = '<span class="filter-label">FILTER:</span>';
  genres.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (g === 'all' ? ' active' : '');
    btn.dataset.filter = g;
    btn.textContent = g.toUpperCase();
    btn.addEventListener('click', () => applyFilter(g));
    bar.appendChild(btn);
  });
}

const DEFAULT_GENRES = {
  all:   ['action','adventure','anime','comedy','crime','cult','documentary','drama','fantasy','history','horror','mystery','noir','sci-fi','thriller','war','western'],
  movie: ['action','adventure','anime','comedy','crime','cult','documentary','drama','fantasy','history','horror','mystery','noir','sci-fi','thriller','war','western'],
  tv:    ['action','adventure','anime','comedy','crime','documentary','drama','fantasy','history','horror','mystery','sci-fi','thriller','war'],
  game:  ['action','adventure','arcade','fighting','horror','indie','mmo','platformer','puzzle','racing','rpg','shooter','simulation','sports','strategy']
};

function getAllGenres() {
  const set = new Set();
  getCategoryReviews().forEach(r => r.genres.forEach(g => set.add(g)));
  (DEFAULT_GENRES[activeCategory] || DEFAULT_GENRES.all).forEach(g => set.add(g));
  return ['all', ...Array.from(set).sort()];
}

// ── BUILD GENRE TAGS (sidebar) ────────────────────────────────
function buildGenreTags() {
  const container = document.getElementById('genre-tags');
  if (!container) return;
  const genres = getAllGenres();
  container.innerHTML = '';
  genres.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'genre-tag' + (g === 'all' ? ' active' : '');
    btn.dataset.filter = g;
    btn.textContent = g.charAt(0).toUpperCase() + g.slice(1);
    btn.addEventListener('click', () => applyFilter(g));
    container.appendChild(btn);
  });
}

// ── BUILD TOP RATED SIDEBAR ───────────────────────────────────
function buildTopRated() {
  const list = document.getElementById('top-rated-list');
  if (!list) return;
  const sorted = [...getCategoryReviews()].sort((a, b) => b.score - a.score).slice(0, 5);
  list.innerHTML = '';
  sorted.forEach(r => {
    const li = document.createElement('li');
    li.dataset.id = r.id;
    li.innerHTML = `
      <span class="sidebar-movie-title">${r.title} (${r.year})</span>
      <span class="sidebar-score">${r.score}/10</span>
    `;
    li.addEventListener('click', () => openModal(r.id));
    list.appendChild(li);
  });
}

// ── STATS ─────────────────────────────────────────────────────
function updateStats(filtered) {
  const base   = getCategoryReviews();
  const total  = filtered.length;
  const allG   = new Set();
  filtered.forEach(r => r.genres.forEach(g => allG.add(g)));
  const earliest = filtered.length > 0 ? Math.min(...filtered.map(r => r.year)) : '—';
  const avg      = total > 0
    ? (filtered.reduce((s, r) => s + r.score, 0) / total).toFixed(1)
    : '—';

  const el = (id) => document.getElementById(id);
  if (el('stat-total'))    el('stat-total').textContent    = total;
  if (el('stat-genres'))   el('stat-genres').textContent   = allG.size;
  if (el('stat-earliest')) el('stat-earliest').textContent = earliest;
  if (el('stat-avg'))      el('stat-avg').textContent      = avg;
}

// ── RENDER CARDS ─────────────────────────────────────────────
function render() {
  const filtered   = getFilteredReviews();
  const totalPages = Math.max(1, Math.ceil(filtered.length / REVIEWS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * REVIEWS_PER_PAGE;
  const page  = filtered.slice(start, start + REVIEWS_PER_PAGE);

  const container = document.getElementById('reviews-container');
  container.innerHTML = '';

  page.forEach(r => {
    const genreDisplay = r.genres.join(' / ');
    const article = document.createElement('article');
    article.className = 'review-card';
    article.dataset.id = r.id;
    article.innerHTML = `
      ${pixelCorners()}
      <div class="card-header">
        <div class="card-genre">${genreDisplay}</div>
        ${r.featured ? '<div class="featured-badge">featured</div>' : ''}
      </div>
      <div class="card-title">${r.title} (${r.year})</div>
      <div class="card-director">// ${r.director} //</div>
      <div class="card-excerpt">${r.excerpt}</div>
      <div class="card-footer">
        <div class="rating">${buildRatingBlocks(r.score)}</div>
        <a href="#" class="read-more" data-id="${r.id}">read full review</a>
      </div>
    `;

    article.addEventListener('click', e => {
      if (!e.target.closest('.read-more')) openModal(r.id);
    });
    article.querySelector('.read-more').addEventListener('click', e => {
      e.preventDefault();
      openModal(r.id);
    });

    container.appendChild(article);
  });

  const noResults = document.getElementById('no-results');
  if (noResults) noResults.style.display = filtered.length === 0 ? 'block' : 'none';

  updateStats(filtered);
  renderPagination(totalPages);
}

// ── PAGINATION ────────────────────────────────────────────────
function renderPagination(totalPages) {
  const el = document.getElementById('pagination');
  if (!el) return;
  el.innerHTML = '';

  const prev = document.createElement('button');
  prev.className = 'page-btn';
  prev.textContent = '<< PREV';
  prev.disabled = currentPage === 1;
  prev.addEventListener('click', () => goToPage(currentPage - 1));
  el.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
    btn.textContent = String(i).padStart(2, '0');
    btn.addEventListener('click', () => goToPage(i));
    el.appendChild(btn);
  }

  const next = document.createElement('button');
  next.className = 'page-btn';
  next.textContent = 'NEXT >>';
  next.disabled = currentPage === totalPages;
  next.addEventListener('click', () => goToPage(currentPage + 1));
  el.appendChild(next);

  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `// PAGE ${currentPage} OF ${totalPages}`;
  el.appendChild(info);
}

function goToPage(page) {
  currentPage = page;
  render();
  document.querySelector('.reviews-col').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── MODAL ─────────────────────────────────────────────────────
function openModal(id) {
  const r = REVIEWS.find(r => r.id === id);
  if (!r) return;

  const genreDisplay = r.genres.join(' / ');
  const bodyHtml     = r.body.map(p => `<p>${p}</p>`).join('');
  const directorLabel = r.category === 'game' ? 'Developer' : 'Director';

  document.getElementById('modal-inner').innerHTML = `
    <div class="modal-genre">${genreDisplay}</div>
    <div class="modal-title">${r.title} (${r.year})</div>
    <div class="modal-meta">// ${r.director} · ${r.runtime} · ${r.rating} //</div>
    <div class="modal-divider"></div>
    <div class="modal-body">${bodyHtml}</div>
    <div class="modal-footer">
      <div>
        <div class="verdict-label">VERDICT</div>
        <div class="verdict-text">${r.verdict}</div>
      </div>
      <div>
        <div class="rating" style="margin-bottom:4px;">${buildRatingBlocks(r.score)}</div>
      </div>
    </div>
  `;

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('open');
  overlay.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── INIT (called by each page) ────────────────────────────────
function initPage(category) {
  activeCategory = category || 'all';
  currentFilter  = 'all';
  currentPage    = 1;

  buildFilterBar();
  buildGenreTags();
  buildTopRated();
  render();

  // modal close handlers
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}
