let currentTopCategory = 'game';
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

function categoryLabel(category) {
  if (category === 'movie') return 'MOVIE';
  if (category === 'tv') return 'TV';
  if (category === 'game') return 'GAME';
  return 'REVIEW';
}

function categoryIcon(category) {
  if (category === 'movie') return '▶';
  if (category === 'tv') return '◈';
  if (category === 'game') return '◆';
  return '•';
}

function reviewUrl(review) {
  const pages = {
    movie: 'movies.html',
    tv: 'tv.html',
    game: 'games.html'
  };
  return `${pages[review.category] || 'movies.html'}#${review.id}`;
}

function openOrRedirectReview(reviewOrId) {
  const review = typeof reviewOrId === 'object'
    ? reviewOrId
    : REVIEWS.find(r => r.id === reviewOrId);

  if (!review) return;

  if (activeCategory === 'all') {
    window.location.href = reviewUrl(review);
    return;
  }

  openModal(review.id);
}

function injectHomeCategoryStyles() {
  if (document.getElementById('home-category-card-styles')) return;

  const style = document.createElement('style');
  style.id = 'home-category-card-styles';
  style.textContent = `
    .home-card {
      cursor: pointer;
      position: relative;
    }

    .home-card.review-card-category-movie {
      border-left: 4px solid #e6b84a !important;
      border-color: rgba(184,138,27,0.45) !important;
    }

    .home-card.review-card-category-tv {
      border-left: 4px solid var(--green) !important;
      border-color: rgba(79,255,176,0.35) !important;
    }

    .home-card.review-card-category-game {
      border-left: 4px solid #c0392b !important;
      border-color: rgba(192,57,43,0.45) !important;
    }

    .home-card.review-card-category-movie:hover {
      border-color: rgba(255,216,107,0.85) !important;
      background: rgba(184,138,27,0.09) !important;
      box-shadow: 0 0 12px rgba(255,216,107,0.14);
    }

    .home-card.review-card-category-tv:hover {
      border-color: rgba(79,255,176,0.75) !important;
      background: rgba(79,255,176,0.06) !important;
    }

    .home-card.review-card-category-game:hover {
      border-color: rgba(192,57,43,0.85) !important;
      background: rgba(139,26,26,0.10) !important;
    }

    .category-badge {
      font-family: 'Press Start 2P', monospace;
      font-size: 6px;
      letter-spacing: 1px;
      padding: 5px 7px;
      line-height: 1;
      border: 1px solid currentColor;
      background: rgba(5,14,24,0.45);
      white-space: nowrap;
    }

    .category-badge.category-movie {
      color: #ffd86b;
      border-color: #e6b84a;
      background: rgba(184,138,27,0.10);
    }

    .category-badge.category-tv {
      color: var(--green);
    }

    .category-badge.category-game {
      color: #e74c3c;
    }


    .home-card.review-card-category-movie .read-more {
      color: #ffd86b !important;
    }

    .home-card.review-card-category-movie .read-more:hover {
      color: #fff !important;
    }

    .home-card.review-card-category-movie .card-genre {
      color: #ffd86b !important;
    }

    .home-card.review-card-category-movie .pixel-corner {
      background: #e6b84a !important;
    }


    .featured-home-block {
      margin-bottom: 24px;
      padding-bottom: 22px;
      border-bottom: 1px dashed rgba(59,191,255,0.22);
    }

    .featured-home-label {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      letter-spacing: 2px;
      color: var(--accent);
      margin-bottom: 12px;
      text-shadow: 0 0 10px rgba(255,224,102,0.35);
    }

    .featured-home-block .review-card {
      transform: scale(1.01);
      box-shadow: 0 0 20px rgba(255,224,102,0.06);
    }

    .latest-home-label {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      letter-spacing: 2px;
      color: var(--muted);
      margin: 6px 0 14px;
    }

    .related-reviews {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px dashed rgba(59,191,255,0.25);
    }

    .related-title {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      letter-spacing: 2px;
      color: var(--muted);
      margin-bottom: 12px;
    }

    .related-list {
      display: grid;
      gap: 8px;
    }

    .related-link {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      text-decoration: none;
      padding: 10px 12px;
      background: rgba(5,14,24,0.45);
      border: 1px solid rgba(59,191,255,0.18);
      border-left: 3px solid var(--blue-light);
      transition: background 0.15s, border-color 0.15s;
    }

    .related-link:hover {
      background: rgba(59,191,255,0.07);
      border-color: rgba(59,191,255,0.5);
    }

    .related-link.review-card-category-movie {
      border-left-color: #e6b84a;
      border-color: rgba(184,138,27,0.32);
    }

    .related-link.review-card-category-movie:hover {
      border-color: rgba(255,216,107,0.75);
      background: rgba(184,138,27,0.08);
    }

    .related-link.review-card-category-tv {
      border-left-color: var(--green);
      border-color: rgba(79,255,176,0.28);
    }

    .related-link.review-card-category-tv:hover {
      background: rgba(79,255,176,0.07);
      border-color: rgba(79,255,176,0.55);
    }

    .related-link.review-card-category-game {
      border-left-color: #c0392b;
      border-color: rgba(192,57,43,0.35);
    }

    .related-link.review-card-category-game:hover {
      background: rgba(139,26,26,0.10);
      border-color: rgba(192,57,43,0.75);
    }

    .related-name {
      font-family: 'VT323', monospace;
      font-size: 20px;
      color: var(--text);
      line-height: 1.1;
    }

    .related-score {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      color: var(--accent);
      white-space: nowrap;
    }

    .review-inline-image {
      margin: 24px 0;
    }

    .review-inline-image img {
      width: 100%;
      display: block;
      border: 1px solid rgba(59,191,255,0.25);
      background: var(--bg);
    }

    .review-inline-image figcaption {
      font-family: 'VT323', monospace;
      font-size: 18px;
      color: var(--muted);
      margin-top: 8px;
      line-height: 1.2;
    }

    .modal-box .review-inline-image img {
      max-height: 520px;
      object-fit: cover;
    }


    .home-card .read-more {
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);
}

function openReviewFromHash() {
  if (activeCategory === 'all') return;
  if (!window.location.hash) return;

  const id = parseInt(window.location.hash.replace('#', ''), 10);
  if (!id) return;

  const review = REVIEWS.find(r => r.id === id && r.category === activeCategory);
  if (!review) return;

  openModal(review.id);
}


function getFeaturedReview(baseReviews) {
  if (activeCategory !== 'all') return null;
  if (currentFilter !== 'all') return null;
  if (currentPage !== 1) return null;
  return baseReviews.find(r => r.featured) || null;
}

function getRelatedReviews(review) {
  const reviewGenres = new Set(review.genres || []);

  const sameCategory = REVIEWS
    .filter(r => r.id !== review.id && r.category === review.category)
    .map(r => {
      const sharedGenres = (r.genres || []).filter(g => reviewGenres.has(g)).length;
      return { review: r, sharedGenres };
    })
    .sort((a, b) => {
      if (b.sharedGenres !== a.sharedGenres) return b.sharedGenres - a.sharedGenres;
      if (b.review.score !== a.review.score) return b.review.score - a.review.score;
      return b.review.year - a.review.year;
    });

  const related = sameCategory
    .filter(item => item.sharedGenres > 0)
    .map(item => item.review);

  for (const item of sameCategory) {
    if (related.length >= 3) break;
    if (!related.some(r => r.id === item.review.id)) {
      related.push(item.review);
    }
  }

  if (related.length < 3) {
    const crossCategory = REVIEWS
      .filter(r => r.id !== review.id && r.category !== review.category)
      .map(r => {
        const sharedGenres = (r.genres || []).filter(g => reviewGenres.has(g)).length;
        return { review: r, sharedGenres };
      })
      .filter(item => item.sharedGenres > 0)
      .sort((a, b) => {
        if (b.sharedGenres !== a.sharedGenres) return b.sharedGenres - a.sharedGenres;
        if (b.review.score !== a.review.score) return b.review.score - a.review.score;
        return b.review.year - a.review.year;
      });

    for (const item of crossCategory) {
      if (related.length >= 3) break;
      if (!related.some(r => r.id === item.review.id)) {
        related.push(item.review);
      }
    }
  }

  return related.slice(0, 3);
}

function renderRelatedReviews(review) {
  const related = getRelatedReviews(review);
  if (!related.length) return '';

  return `
    <div class="related-reviews">
      <div class="related-title">you might also like</div>
      <div class="related-list">
        ${related.map(r => `
          <a href="${reviewUrl(r)}" class="related-link review-card-category-${r.category}" data-id="${r.id}">
            <span class="related-name">${r.title} (${r.year})</span>
            <span class="related-score">${r.score}/10</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;
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
    li.addEventListener('click', () => openOrRedirectReview(r));
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
function createReviewCard(r, isHome) {
  const genreDisplay = r.genres.join(' / ');
  const article = document.createElement('article');
  const targetUrl = reviewUrl(r);
  const badgeHtml = isHome
    ? `<div class="category-badge category-${r.category}">${categoryIcon(r.category)} ${categoryLabel(r.category)}</div>`
    : '';

  article.className = `review-card review-card-category-${r.category}${isHome ? ' home-card' : ''}`;
  article.dataset.id = r.id;
  article.innerHTML = `
    ${pixelCorners()}
    <div class="card-header">
      <div class="card-genre">${genreDisplay}</div>
      ${badgeHtml}
      ${r.featured ? '<div class="featured-badge">featured</div>' : ''}
    </div>
    <div class="card-title">${r.title} (${r.year})</div>
    <div class="card-director">// ${r.director} //</div>
    <div class="card-excerpt">${r.excerpt}</div>
    <div class="card-footer">
      <div class="rating">${buildRatingBlocks(r.score)}</div>
      <a href="${isHome ? targetUrl : '#'}" class="read-more" data-id="${r.id}">
        ${isHome ? 'open in ' + categoryLabel(r.category).toLowerCase() : 'read full review'}
      </a>
    </div>
  `;

  article.addEventListener('click', e => {
    if (!e.target.closest('.read-more')) openOrRedirectReview(r);
  });

  article.querySelector('.read-more').addEventListener('click', e => {
    if (!isHome) e.preventDefault();
    openOrRedirectReview(r);
  });

  return article;
}

// ── RENDER CARDS ─────────────────────────────────────────────
function render() {
  const filtered   = getFilteredReviews();
  const isHome     = activeCategory === 'all';
  const featured   = getFeaturedReview(filtered);
  const listForPagination = featured ? filtered.filter(r => r.id !== featured.id) : filtered;
  const totalPages = Math.max(1, Math.ceil(listForPagination.length / REVIEWS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * REVIEWS_PER_PAGE;
  const page  = listForPagination.slice(start, start + REVIEWS_PER_PAGE);

  const container = document.getElementById('reviews-container');
  container.innerHTML = '';

  if (featured) {
    const featuredBlock = document.createElement('div');
    featuredBlock.className = 'featured-home-block';
    featuredBlock.innerHTML = '<div class="featured-home-label">featured review</div>';
    featuredBlock.appendChild(createReviewCard(featured, true));
    container.appendChild(featuredBlock);

    if (page.length) {
      const latestLabel = document.createElement('div');
      latestLabel.className = 'latest-home-label';
      latestLabel.textContent = 'latest reviews';
      container.appendChild(latestLabel);
    }
  }

  page.forEach(r => {
    container.appendChild(createReviewCard(r, isHome));
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

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderReviewImage(img) {
  if (!img || !img.src) return '';

  return `
    <figure class="review-inline-image">
      <img src="${escapeAttr(img.src)}" alt="${escapeAttr(img.caption || 'Review screenshot')}" loading="lazy">
      ${img.caption ? `<figcaption>${escapeAttr(img.caption)}</figcaption>` : ''}
    </figure>
  `;
}

function renderBodyWithImages(review) {
  const images = Array.isArray(review.images) ? review.images : [];

  return review.body.map((p, index) => {
    const paragraphNumber = index + 1;
    const inlineImages = images
      .filter(img => Number(img.afterParagraph) === paragraphNumber)
      .map(renderReviewImage)
      .join('');

    return `<p>${p}</p>${inlineImages}`;
  }).join('');
}

function openModal(id) {
  const r = REVIEWS.find(r => r.id === id);
  if (!r) return;

  const genreDisplay = r.genres.join(' / ');
  const bodyHtml = renderBodyWithImages(r);
  const directorLabel = r.category === 'game' ? 'Developer' : 'Director';

  document.getElementById('modal-inner').innerHTML = `
    <div class="modal-genre">${genreDisplay}</div>
    <div class="modal-title">${r.title} (${r.year})</div>
    <div class="modal-meta">// ${r.director} · ${r.runtime} · ${r.rating} //</div>
    <div class="modal-divider"></div>
    <div class="modal-body">${bodyHtml}</div>
    ${renderRelatedReviews(r)}
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

  document.querySelectorAll('.related-link').forEach(link => {
    link.addEventListener('click', e => {
      const id = parseInt(link.dataset.id, 10);
      const related = REVIEWS.find(item => item.id === id);
      if (!related) return;

      if (related.category === activeCategory) {
        e.preventDefault();
        openModal(id);
      }
    });
  });

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

function setupTopRatedTabs() {
  const topTabs = document.getElementById('top-tabs');
  if (!topTabs) return;

  const tabs = topTabs.querySelectorAll('.top-tab');
  if (!tabs.length) return;

  const activeTab = topTabs.querySelector('.top-tab.active') || tabs[0];

  tabs.forEach(tab => tab.classList.remove('active'));
  activeTab.classList.add('active');
  currentTopCategory = activeTab.dataset.cat || 'game';

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      currentTopCategory = tab.dataset.cat || 'game';
      renderTopRated();
    });
  });
}

function renderTopRated() {
  const list = document.getElementById('top-rated-list');
  if (!list) return;

  const topTabs = document.getElementById('top-tabs');
  const activeTab = topTabs ? topTabs.querySelector('.top-tab.active') : null;

  const categoryToShow = topTabs
    ? (activeTab?.dataset.cat || currentTopCategory || 'game')
    : activeCategory;

  currentTopCategory = categoryToShow || 'game';

  const topReviews = REVIEWS
    .filter(r => {
      const score = Number(r.score) || 0;
      const categoryMatches = categoryToShow === 'all' || r.category === categoryToShow;
      return categoryMatches && score >= 8;
    })
    .sort((a, b) => {
      const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (Number(b.year) || 0) - (Number(a.year) || 0);
    })
    .slice(0, 5);

  list.innerHTML = topReviews.length
    ? topReviews.map(r => `
      <li data-id="${r.id}">
        <span class="sidebar-movie-title">${r.title}</span>
        <span class="sidebar-score">${r.score}/10</span>
      </li>
    `).join('')
    : '<li><span class="sidebar-movie-title">No 8+/10 reviews yet</span></li>';

  list.querySelectorAll('li[data-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id, 10);
      const review = REVIEWS.find(r => r.id === id);
      if (!review) return;

      if (activeCategory === 'all') {
        window.location.href = reviewUrl(review);
      } else {
        openModal(id);
      }
    });
  });
}

function initPage(category) {
  activeCategory = category || 'all';
  currentFilter  = 'all';
  currentPage    = 1;

  injectHomeCategoryStyles();
  buildFilterBar();
  buildGenreTags();
  buildTopRated();
  render();

  // modal close handlers
  const closeBtn = document.getElementById('modal-close');
  const overlay = document.getElementById('modal-overlay');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  openReviewFromHash();

  setupTopRatedTabs();
  renderTopRated();
}
