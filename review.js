(function () {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const categories = {
    movie: { label: 'Movie', archive: 'Movies', href: 'movies.html' },
    tv: { label: 'TV', archive: 'TV Shows', href: 'tv.html' },
    game: { label: 'Game', archive: 'Games', href: 'games.html' },
  };

  function reviewUrl(review) {
    return review.slug
      ? 'review.html?slug=' + encodeURIComponent(review.slug)
      : 'review.html?id=' + encodeURIComponent(review.id);
  }

  function applyPageSEO(review) {
    // Title: explicit field wins; otherwise auto-generate
    var pageTitle;
    if (review.seoTitle) {
      pageTitle = review.seoTitle;
    } else {
      var yearSuffix = review.year ? ' (' + review.year + ')' : '';
      pageTitle = review.title + ' Review' + yearSuffix + ' | WretVision';
    }

    // Description: explicit field wins; otherwise excerpt → verdict, capped at 160 chars
    var desc;
    if (review.seoDescription) {
      desc = review.seoDescription;
    } else {
      var rawDesc = review.excerpt || review.verdict || (review.title + ' review on WretVision.');
      desc = rawDesc.length > 160 ? rawDesc.slice(0, 157) + '...' : rawDesc;
    }
    if (desc.length > 160) {
      console.warn('SEO: description exceeds 160 chars for "' + review.title + '" (' + desc.length + ' chars)');
    }

    // Canonical always uses the slug URL — prevents duplicate-content issues
    // when a review is accessed via the legacy ?id= parameter.
    var canonicalUrl = 'https://wretvision.com/' + reviewUrl(review);

    document.title = pageTitle;

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);

    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);

    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);

    var ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', canonicalUrl);
  }


  function setBackdrop(media) {
    const image = byId('review-backdrop');
    const backdrop = media?.backdrop;
    const poster = media?.poster;
    image.addEventListener('load', () => { image.hidden = false; });
    image.addEventListener('error', () => {
      if (backdrop && poster && backdrop !== poster && image.getAttribute('src') === backdrop) {
        image.src = poster;
      } else {
        image.hidden = true;
      }
    });
    if (backdrop || poster) image.src = backdrop || poster;
  }

  function showLink(link, href) {
    link.href = href;
    link.hidden = false;
  }

  function renderVideo(review) {
    const url = review.youtube || review.media?.youtube;
    if (!url) return;
    const frame = document.createElement('iframe');
    frame.src = url;
    frame.title = review.title + ' Review';
    frame.loading = 'lazy';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    const section = byId('review-video');
    section.append(frame);
    section.hidden = false;
  }

  function renderRelated(review, categoryReviews) {
    const genres = new Set((review.genres || []).map((genre) => genre.toLowerCase()));
    const related = categoryReviews
      .filter((item) => item.id !== review.id)
      .map((item) => ({
        item,
        matchingGenres: (item.genres || []).filter((genre) => genres.has(genre.toLowerCase())),
      }))
      .filter(({ matchingGenres }) => matchingGenres.length > 0)
      .sort((left, right) => right.matchingGenres.length - left.matchingGenres.length)
      .slice(0, 3);

    const list = byId('review-related-list');
    for (const { item, matchingGenres } of related) {
      const link = document.createElement('a');
      link.className = 'review-card';
      link.href = item.externalUrl || reviewUrl(item);

      const art = document.createElement('div');
      art.className = 'review-card-art';
      const imageUrl = item.media?.backdrop || item.media?.poster;
      if (imageUrl) {
        const image = document.createElement('img');
        image.alt = '';
        image.loading = 'lazy';
        image.addEventListener('error', () => image.remove());
        image.src = imageUrl;
        art.append(image);
      }

      const details = document.createElement('div');
      details.className = 'review-card-details';
      const title = document.createElement('h3');
      title.textContent = item.title + (item.season ? ' Season ' + item.season : '');
      const context = document.createElement('p');
      context.textContent = matchingGenres.slice(0, 2).join(' · ');
      details.append(title, context);
      link.append(art, details);
      list.append(link);
    }
    byId('review-related').hidden = related.length === 0;
  }

  const ROP_S3_EPISODES = [
    { ep: 1, title: 'Marnûkh', date: 'Nov 11', slug: 'rings-of-power-season-3-episode-1-review' },
    { ep: 2, title: 'The Gift of Men', date: 'Nov 11', slug: 'rings-of-power-season-3-episode-2-review' },
    { ep: 3, title: 'The Secret Fire', date: 'Nov 11', slug: 'rings-of-power-season-3-episode-3-review' },
    { ep: 4, title: 'Gundabad', date: 'Nov 11', slug: 'rings-of-power-season-3-episode-4-review' },
    { ep: 5, title: 'Episode 5', date: 'Nov 18', slug: 'rings-of-power-season-3-episode-5-review' },
    { ep: 6, title: 'Episode 6', date: 'Nov 18', slug: 'rings-of-power-season-3-episode-6-review' },
    { ep: 7, title: 'Episode 7', date: 'Nov 25', slug: 'rings-of-power-season-3-episode-7-review' },
    { ep: 8, title: 'Season Finale', date: 'Nov 25', slug: 'rings-of-power-season-3-episode-8-review' }
  ];

  function renderSeriesNav(review, allReviews) {
    const navEl = byId('series-nav');
    if (!navEl) return;
    const isRop = (review.series && review.series.toLowerCase().includes('rings of power')) ||
                  (review.title && review.title.toLowerCase().includes('rings of power'));
    if (!isRop || review.season !== 3) {
      navEl.hidden = true;
      return;
    }

    const listEl = byId('series-nav-list');
    listEl.innerHTML = ROP_S3_EPISODES.map(item => {
      const epReview = allReviews.find(r =>
        (r.series && r.series.toLowerCase().includes('rings of power') && r.season === 3 && r.episode === item.ep) ||
        (r.slug && r.slug === item.slug) ||
        (r.title && r.title.toLowerCase().includes('episode ' + item.ep))
      );

      const isCurrent = (epReview && (epReview.id === review.id || epReview.slug === review.slug)) ||
                        (review.episode === item.ep);
      if (isCurrent) {
        return `<span class="series-nav-item current">Ep ${item.ep}: ${item.title} (${review.score ?? '—'}/10)</span>`;
      }
      if (epReview) {
        return `<a href="${reviewUrl(epReview)}" class="series-nav-item">Ep ${item.ep}: ${item.title} (${epReview.score ?? '—'}/10)</a>`;
      }
      return `<span class="series-nav-item pending" title="Air date: ${item.date}">Ep ${item.ep}: ${item.title} (Soon)</span>`;
    }).join('');

    navEl.hidden = false;
  }

  function renderReview(review, allReviews) {
    const category = categories[review.category];
    const archive = byId('review-back');
    if (category) {
      archive.href = category.href;
      archive.textContent = '← All ' + category.archive;
      document.querySelector('[data-category="' + review.category + '"]').setAttribute('aria-current', 'true');
    }

    byId('review-category').textContent = [
      (category?.label || 'Media') + ' review',
      ...(review.genres || []).slice(0, 2),
    ].join(' · ');
    const hasSeason = /season\s+\d+/i.test(review.title);
    byId('review-title').textContent = review.title + (!hasSeason && review.season ? ' Season ' + review.season : '');
    byId('review-meta').textContent = [
      review.year,
      review.director && (review.category === 'game' ? 'Developed by ' : 'Directed by ') + review.director,
      review.runtime,
      review.rating,
    ].filter(Boolean).join(' · ');

    renderSeriesNav(review, allReviews);

    byId('review-score-block').hidden = review.score == null;
    byId('review-score').textContent = review.score ?? '';
    byId('review-verdict').textContent = review.verdict || review.excerpt || '';
    for (const paragraph of review.body || []) {
      const element = document.createElement('p');
      element.textContent = paragraph;
      byId('review-body').append(element);
    }
    if (review.steamReviewUrl) {
      showLink(byId('review-steam').querySelector('a'), review.steamReviewUrl);
      byId('review-steam').hidden = false;
    }

    const categoryReviews = allReviews.filter((item) => item.category === review.category);
    const index = categoryReviews.indexOf(review);
    const previous = categoryReviews[index - 1];
    const next = categoryReviews[index + 1];
    if (previous) showLink(byId('review-prev'), reviewUrl(previous));
    if (next) showLink(byId('review-next'), reviewUrl(next));

    setBackdrop(review.media);
    renderVideo(review);
    renderRelated(review, categoryReviews);
    applyPageSEO(review);
    byId('review').hidden = false;
    if (review.slug) window.WretVisionComments?.init(review.slug, 'rv-comments');
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const id = parseInt(params.get('id'), 10);
  const allReviews = typeof REVIEWS === 'undefined' ? [] : REVIEWS;
  const review = slug ? allReviews.find((item) => item.slug === slug) : allReviews.find((item) => item.id === id);

  if (!review) {
    const error = byId('review-error');
    const home = document.createElement('a');
    home.href = 'index.html';
    home.textContent = 'Return to WretVision';
    error.append('This review could not be found. ', home);
    error.hidden = false;
    return;
  }
  if (review.externalUrl) {
    window.location.replace(review.externalUrl);
    return;
  }
  if (!slug && review.slug) window.history.replaceState({}, '', reviewUrl(review));
  renderReview(review, allReviews);
}());
