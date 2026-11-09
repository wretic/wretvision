/* ============================================================
   WRETVISION — HORROR VAULT LOGIC (vault.js)
   ============================================================ */

(function () {
  'use strict';

  const vaultData = typeof HORROR_VAULT !== 'undefined' ? HORROR_VAULT : [];
  const reviewsData = typeof REVIEWS !== 'undefined' ? REVIEWS : [];

  function normalize(s) {
    return (s || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();
  }

  // Map review titles to review objects for instant O(1) lookup
  const reviewMap = new Map();
  for (const rev of reviewsData) {
    const key = `${normalize(rev.title)}|${rev.year || ''}`;
    reviewMap.set(key, rev);
    // Also map by title alone if year is slightly off
    if (!reviewMap.has(normalize(rev.title))) {
      reviewMap.set(normalize(rev.title), rev);
    }
  }

  function getReviewForVaultItem(item) {
    const fullKey = `${normalize(item.title)}|${item.year || ''}`;
    return reviewMap.get(fullKey) || reviewMap.get(normalize(item.title)) || null;
  }

  function reviewUrl(review) {
    return review.slug
      ? 'review.html?slug=' + encodeURIComponent(review.slug)
      : 'review.html?id=' + encodeURIComponent(review.id);
  }

  // ── Stats Calculation ──
  function setupStats() {
    const totalEl = document.getElementById('stat-total');
    const reviewedEl = document.getElementById('stat-reviewed');
    const spanEl = document.getElementById('stat-span');

    let reviewedCount = 0;
    const years = [];

    for (const item of vaultData) {
      if (item.year) years.push(item.year);
      if (getReviewForVaultItem(item)) reviewedCount++;
    }

    if (totalEl) totalEl.textContent = vaultData.length;
    if (reviewedEl) reviewedEl.textContent = reviewedCount;
    if (spanEl && years.length) {
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      spanEl.textContent = `${minYear} – ${maxYear}`;
    }
  }

  // ── Decade Summary Bars ──
  function setupDecadeBars() {
    const container = document.getElementById('decade-bars');
    if (!container) return;

    const decadeOrder = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s', '1950s', '1930s', '1920s'];
    const counts = {};
    for (const d of decadeOrder) counts[d] = 0;

    for (const item of vaultData) {
      if (item.decade && counts[item.decade] !== undefined) {
        counts[item.decade]++;
      }
    }

    const maxCount = Math.max(...Object.values(counts));

    container.innerHTML = decadeOrder.filter(d => counts[d] > 0).map(d => {
      const count = counts[d];
      const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
      return `
        <div class="decade-bar-row">
          <span class="decade-bar-label">${d}</span>
          <div class="decade-bar-track">
            <div class="decade-bar-fill" style="width: ${pct}%;"></div>
          </div>
          <span class="decade-bar-count">${count}</span>
        </div>
      `;
    }).join('');
  }

  // ── Grid & Card Rendering ──
  let activeDecade = 'all';
  let onlyReviewed = false;
  let searchQuery = '';

  function renderCard(item) {
    const review = getReviewForVaultItem(item);
    const poster = item.poster || (review?.media?.poster) || '';
    const initial = (item.title || '?').trim().charAt(0).toUpperCase();

    const posterMarkup = poster
      ? `<img src="${poster}" alt="${item.title}" loading="lazy" onerror="this.outerHTML='<div class=&quot;no-poster&quot;>${initial}</div>'">`
      : `<div class="no-poster">${initial}</div>`;

    const badgeMarkup = review
      ? `<span class="vcard-badge">Reviewed ↗</span>`
      : '';

    const href = review ? reviewUrl(review) : '#';
    const tag = review ? 'a' : 'div';

    return `
      <${tag} ${review ? `href="${href}"` : ''} class="vcard ${review ? 'has-review' : ''}" data-id="${item.id}" id="vcard-${item.id}">
        ${posterMarkup}
        ${badgeMarkup}
        <div class="vcard-overlay">
          <div class="vcard-title">${item.title}</div>
          <div class="vcard-meta">
            <span>${item.year || ''}</span>
            ${item.decade ? `<span>· ${item.decade}</span>` : ''}
          </div>
          ${review ? `<div class="vcard-cta">Read Review (${review.score}/10) →</div>` : ''}
        </div>
      </${tag}>
    `;
  }

  function applyFilters() {
    const gridEl = document.getElementById('vault-grid');
    const counterEl = document.getElementById('vault-filter-count');
    if (!gridEl) return;

    const filtered = vaultData.filter(item => {
      // Decade filter
      if (activeDecade !== 'all') {
        if (activeDecade === 'pre-70s') {
          const y = item.year || 0;
          if (y >= 1970) return false;
        } else if (item.decade !== activeDecade) {
          return false;
        }
      }

      // Reviewed only filter
      if (onlyReviewed && !getReviewForVaultItem(item)) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const matchTitle = normalize(item.title).includes(searchQuery);
        const matchNote = normalize(item.note).includes(searchQuery);
        if (!matchTitle && !matchNote) return false;
      }

      return true;
    });

    if (counterEl) {
      counterEl.textContent = `Showing ${filtered.length} of ${vaultData.length} films`;
    }

    if (filtered.length === 0) {
      gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 3rem;">No films matched your filter.</div>`;
    } else {
      gridEl.innerHTML = filtered.map(renderCard).join('');
    }
  }

  // ── Decade Pills Setup ──
  function setupDecadePills() {
    const pills = document.querySelectorAll('.decade-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeDecade = pill.dataset.decade;
        applyFilters();
      });
    });
  }

  // ── Reviewed Toggle Setup ──
  function setupReviewedToggle() {
    const btn = document.getElementById('toggle-reviewed');
    if (!btn) return;
    btn.addEventListener('click', () => {
      onlyReviewed = !onlyReviewed;
      btn.classList.toggle('active', onlyReviewed);
      applyFilters();
    });
  }

  // ── Search Setup ──
  function setupSearch() {
    const input = document.getElementById('vault-search');
    if (!input) return;
    input.addEventListener('input', () => {
      searchQuery = normalize(input.value);
      applyFilters();
    });
  }

  // ── Random Draw from Vault ──
  function setupRandomDraw() {
    const btn = document.getElementById('btn-draw');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const cards = document.querySelectorAll('.vcard');
      if (!cards.length) return;

      const randomIdx = Math.floor(Math.random() * cards.length);
      const chosenCard = cards[randomIdx];

      // Remove existing highlights
      document.querySelectorAll('.drawn-highlight').forEach(c => c.classList.remove('drawn-highlight'));

      // Smooth scroll to chosen card
      chosenCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      chosenCard.classList.add('drawn-highlight');

      setTimeout(() => {
        chosenCard.classList.remove('drawn-highlight');
      }, 4000);
    });
  }

  // ── Initialization ──
  setupStats();
  setupDecadeBars();
  setupDecadePills();
  setupReviewedToggle();
  setupSearch();
  setupRandomDraw();
  applyFilters();

})();
