/* ============================================================
   WRETVISION — HOMEPAGE JAVASCRIPT (home.js)
   ============================================================ */

(function () {
  'use strict';

  const allReviews = typeof REVIEWS !== 'undefined' ? REVIEWS : [];

  function reviewUrl(review) {
    return review.slug
      ? 'review.html?slug=' + encodeURIComponent(review.slug)
      : 'review.html?id=' + encodeURIComponent(review.id);
  }

  function isHorror(review) {
    return (review.genres || []).some(g => g.toLowerCase().includes('horror'));
  }

  // ── Watchlist Helpers ──
  const WL_KEY = 'wv_watchlist';
  function getWatchlist() {
    try {
      return JSON.parse(localStorage.getItem(WL_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function toggleWatchlist(id) {
    let list = getWatchlist();
    if (list.includes(id)) {
      list = list.filter(item => item !== id);
    } else {
      list.push(id);
    }
    try {
      localStorage.setItem(WL_KEY, JSON.stringify(list));
    } catch (e) {}
    updateWatchlistUI();
    // If currently filtered by saved, re-render grid
    const activePill = document.querySelector('.pill.active');
    if (activePill && activePill.dataset.filter === 'saved') {
      applyFilter();
    }
  }

  function updateWatchlistUI() {
    const list = getWatchlist();
    const badge = document.getElementById('wl-badge');
    if (badge) {
      badge.textContent = list.length;
      badge.classList.toggle('hidden', list.length === 0);
    }
    // Update all card bookmark icons
    document.querySelectorAll('.card-save').forEach(btn => {
      const id = parseInt(btn.dataset.id, 10);
      const saved = list.includes(id);
      btn.classList.toggle('saved', saved);
      btn.textContent = saved ? '★' : '☆';
    });
  }

  const pageCat = window.PAGE_CATEGORY || null;

  // ── 1. Hero Spotlight ──
  function renderHero(featured) {
    if (!featured) return;

    const backdropEl = document.getElementById('hero-backdrop');
    if (backdropEl) {
      const bgUrl = featured.media?.backdrop || featured.media?.poster;
      if (bgUrl) backdropEl.style.backgroundImage = `url('${bgUrl}')`;
    }

    const kickerEl = document.getElementById('hero-kicker');
    if (kickerEl) {
      const parts = ['Latest Review', featured.year, featured.category?.toUpperCase()];
      if (isHorror(featured)) parts.push('HORROR');
      kickerEl.textContent = parts.filter(Boolean).join(' · ');
    }

    const titleEl = document.getElementById('hero-title');
    if (titleEl) titleEl.textContent = featured.title + (featured.season ? ` Season ${featured.season}` : '');

    const metaEl = document.getElementById('hero-meta');
    if (metaEl) {
      metaEl.textContent = [
        featured.director && (featured.category === 'game' ? 'Developed by ' : 'Directed by ') + featured.director,
        featured.runtime,
        featured.rating,
        (featured.genres || []).slice(0, 3).join(', ')
      ].filter(Boolean).join(' · ');
    }

    const scoreEl = document.getElementById('hero-score');
    if (scoreEl) {
      scoreEl.textContent = featured.score ?? '';
      if (isHorror(featured)) scoreEl.classList.add('horror');
      else scoreEl.classList.remove('horror');
    }

    const verdictEl = document.getElementById('hero-verdict');
    if (verdictEl) verdictEl.textContent = featured.verdict || featured.excerpt || '';

    const readBtn = document.getElementById('hero-read-btn');
    if (readBtn) readBtn.href = reviewUrl(featured);

    const videoBtn = document.getElementById('hero-video-btn');
    if (videoBtn) {
      const ytUrl = featured.youtube || featured.media?.youtube;
      if (ytUrl) {
        videoBtn.href = ytUrl;
        videoBtn.hidden = false;
      } else {
        videoBtn.hidden = true;
      }
    }
  }

  function updateHeroForCategory(cat) {
    let target;
    const effectiveCat = pageCat || cat;
    if (effectiveCat === 'all') {
      target = allReviews.find(r => r.media && (r.media.backdrop || r.media.poster)) || allReviews[0];
    } else if (effectiveCat === 'saved') {
      return;
    } else {
      target = allReviews.find(r => r.category === effectiveCat && r.media && (r.media.backdrop || r.media.poster)) ||
               allReviews.find(r => r.category === effectiveCat);
    }
    if (target) {
      renderHero(target);
    }
  }

  function setupHero() {
    updateHeroForCategory(currentCategory);
  }

  // ── 2. Top Rated Rail ──
  function setupTopRated() {
    const railEl = document.getElementById('top-rail');
    if (!railEl) return;

    const source = pageCat ? allReviews.filter(r => r.category === pageCat) : allReviews;
    const minScore = pageCat === 'game' ? 8.0 : 8.5;
    const topItems = [...source]
      .filter(r => (r.score ?? 0) >= minScore)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10);

    railEl.innerHTML = topItems.map((r, i) => {
      const poster = r.media?.poster || r.media?.backdrop || '';
      const horror = isHorror(r);
      const catColor = r.category === 'movie' ? 'var(--cat-movie)' : r.category === 'tv' ? 'var(--cat-tv)' : 'var(--cat-game)';
      return `
        <a href="${reviewUrl(r)}" class="top-card">
          <div class="top-card-poster">
            <span class="top-rank">#${i + 1}</span>
            <img src="${poster}" alt="${r.title}" loading="lazy" onerror="this.style.opacity='0'">
            <span class="top-score ${horror ? 'horror' : ''}">${r.score}</span>
          </div>
          <div class="top-card-title">${r.title}</div>
          <div class="top-card-meta">${r.year} · <span style="color: ${catColor}; font-weight: 600;">${r.category.toUpperCase()}</span></div>
        </a>
      `;
    }).join('');
  }

  // ── 3. Review Card Template ──
  function renderCard(r) {
    const imgUrl = r.media?.backdrop || r.media?.poster || '';
    const horror = isHorror(r);
    const categoryLabels = { movie: 'Movie', tv: 'TV', game: 'Game' };
    const saved = getWatchlist().includes(r.id);

    return `
      <div class="card cat-${r.category} ${horror ? 'is-horror' : ''}" data-id="${r.id}">
        <div class="card-art">
          <img src="${imgUrl}" alt="${r.title}" loading="lazy" onerror="this.style.display='none'">
          <span class="card-cat-tag">${categoryLabels[r.category] || 'Media'}</span>
          <div class="card-score ${horror ? 'horror' : ''}">${r.score ?? ''}</div>
          <button class="card-save ${saved ? 'saved' : ''}" data-id="${r.id}" title="Save to Watchlist">${saved ? '★' : '☆'}</button>
        </div>
        <div class="card-body">
          <div class="card-kicker">${(r.genres || []).slice(0, 3).join(' · ')}</div>
          <h3 class="card-title">${r.title}${r.season ? ` Season ${r.season}` : ''}</h3>
          <div class="card-meta">${[r.year, r.director, r.runtime].filter(Boolean).join(' · ')}</div>
          <p class="card-excerpt">${r.excerpt || r.verdict || ''}</p>
          <div class="card-footer">
            <span>Read Review →</span>
          </div>
        </div>
      </div>
    `;
  }

  // ── 4. Filtering & Pagination ──
  const PAGE_SIZE = 18;
  let visibleCount = PAGE_SIZE;
  const initialParams = new URLSearchParams(window.location.search);
  const initialCat = initialParams.get('cat') || initialParams.get('category');
  let currentCategory = pageCat || (['movie', 'tv', 'game', 'saved'].includes(initialCat) ? initialCat : 'all');
  let isSavedOnly = currentCategory === 'saved';
  let currentGenre = '';

  function applyFilter(resetPagination = true) {
    const gridEl = document.getElementById('review-grid');
    const paginationEl = document.getElementById('pagination-wrap');
    if (!gridEl) return;

    if (resetPagination) {
      visibleCount = PAGE_SIZE;
    }

    const savedIds = getWatchlist();
    const filtered = allReviews.filter(r => {
      if (pageCat && r.category !== pageCat) return false;

      const matchCat =
        pageCat ||
        currentCategory === 'all' ||
        r.category === currentCategory ||
        (currentCategory === 'saved' && savedIds.includes(r.id));

      if (isSavedOnly && !savedIds.includes(r.id)) return false;

      const matchGenre = !currentGenre || (r.genres || []).some(g => g.toLowerCase() === currentGenre.toLowerCase());
      return matchCat && matchGenre;
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = `<div class="search-empty" style="grid-column: 1 / -1;">No reviews found for this selection.</div>`;
      if (paginationEl) paginationEl.innerHTML = '';
    } else {
      const slice = filtered.slice(0, visibleCount);
      gridEl.innerHTML = slice.map(renderCard).join('');

      if (paginationEl) {
        if (visibleCount < filtered.length) {
          const remaining = filtered.length - visibleCount;
          paginationEl.innerHTML = `
            <div class="pagination-count">Showing ${slice.length} of ${filtered.length} reviews</div>
            <button id="btn-load-more" class="btn-load-more">Load More Reviews (${Math.min(remaining, PAGE_SIZE)} more) ↓</button>
          `;
          document.getElementById('btn-load-more')?.addEventListener('click', () => {
            visibleCount += PAGE_SIZE;
            applyFilter(false);
          });
        } else {
          paginationEl.innerHTML = `
            <div class="pagination-end">Showing all ${filtered.length} reviews · You've reached the end of the archive.</div>
          `;
        }
      }
    }

    updateWatchlistUI();
  }

  function setupFilters() {
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
      if (pill.dataset.filter === currentCategory || (pill.dataset.genre && pill.dataset.genre.toLowerCase() === currentGenre.toLowerCase())) {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      }
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        if (pill.dataset.genre !== undefined) {
          currentGenre = pill.dataset.genre;
          isSavedOnly = false;
          const genreSelect = document.getElementById('genre-select');
          if (genreSelect) genreSelect.value = currentGenre;
        } else if (pill.dataset.filter === 'saved') {
          isSavedOnly = true;
          currentGenre = '';
        } else {
          currentCategory = pill.dataset.filter || (pageCat || 'all');
          currentGenre = '';
          isSavedOnly = false;
          const genreSelect = document.getElementById('genre-select');
          if (genreSelect) genreSelect.value = '';
          updateHeroForCategory(currentCategory);
        }
        applyFilter();
      });
    });

    const genreSelect = document.getElementById('genre-select');
    if (genreSelect) {
      const source = pageCat ? allReviews.filter(r => r.category === pageCat) : allReviews;
      const allGenres = [...new Set(source.flatMap(r => r.genres || []))].sort();
      genreSelect.innerHTML = '<option value="">All Genres</option>' +
        allGenres.map(g => `<option value="${g}">${g}</option>`).join('');

      genreSelect.addEventListener('change', () => {
        currentGenre = genreSelect.value;
        pills.forEach(p => {
          if (p.dataset.genre) {
            p.classList.toggle('active', p.dataset.genre.toLowerCase() === currentGenre.toLowerCase());
          } else if (p.dataset.filter === 'all' && !currentGenre) {
            p.classList.add('active');
          } else {
            p.classList.remove('active');
          }
        });
        applyFilter();
      });
    }

    // Grid card click routing & bookmark clicks
    const gridEl = document.getElementById('review-grid');
    if (gridEl) {
      gridEl.addEventListener('click', e => {
        const saveBtn = e.target.closest('.card-save');
        if (saveBtn) {
          e.preventDefault();
          e.stopPropagation();
          toggleWatchlist(parseInt(saveBtn.dataset.id, 10));
          return;
        }

        const card = e.target.closest('.card');
        if (card) {
          const id = parseInt(card.dataset.id, 10);
          const review = allReviews.find(r => r.id === id);
          if (review) {
            window.location.href = reviewUrl(review);
          }
        }
      });
    }
  }

  // ── 5. Search Modal ──
  function setupSearch() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    const trigger = document.getElementById('search-trigger');

    if (!modal || !input || !results) return;

    function openSearch() {
      modal.classList.add('open');
      input.value = '';
      input.focus();
      renderResults('');
    }

    function closeSearch() {
      modal.classList.remove('open');
    }

    if (trigger) trigger.addEventListener('click', openSearch);

    modal.addEventListener('click', e => {
      if (e.target === modal) closeSearch();
    });

    window.addEventListener('keydown', e => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openSearch();
      } else if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeSearch();
      }
    });

    input.addEventListener('input', () => {
      renderResults(input.value.trim().toLowerCase());
    });

    function renderResults(query) {
      if (!query) {
        results.innerHTML = `<div class="search-empty">Type title or genre to search ${allReviews.length} reviews...</div>`;
        return;
      }
      const matches = allReviews.filter(r =>
        r.title.toLowerCase().includes(query) ||
        (r.director && r.director.toLowerCase().includes(query)) ||
        (r.genres || []).some(g => g.toLowerCase().includes(query))
      ).slice(0, 8);

      if (matches.length === 0) {
        results.innerHTML = `<div class="search-empty">No results found for "${query}".</div>`;
        return;
      }

      results.innerHTML = matches.map(r => `
        <a href="${reviewUrl(r)}" class="search-item">
          <img class="search-thumb" src="${r.media?.poster || r.media?.backdrop || ''}" alt="">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: var(--text);">${r.title} (${r.year || ''})</div>
            <div style="font-size: .82rem; color: var(--muted);">${r.category.toUpperCase()} · ${(r.genres || []).slice(0, 2).join(', ')}</div>
          </div>
          <div style="font-weight: 700; color: var(--accent);">${r.score ?? ''} / 10</div>
        </a>
      `).join('');
    }
  }

  // ── Watchlist Header Trigger ──
  function setupWatchlistTrigger() {
    const wlTrigger = document.getElementById('wl-trigger');
    if (!wlTrigger) return;
    wlTrigger.addEventListener('click', () => {
      const savedPill = document.querySelector('.pill[data-filter="saved"]');
      if (savedPill) {
        savedPill.click();
        document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ── Initialization ──
  setupHero();
  setupTopRated();
  setupFilters();
  setupSearch();
  setupWatchlistTrigger();
  applyFilter();
  updateWatchlistUI();

})();
