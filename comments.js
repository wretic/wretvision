// WretVision Comments — Phase 2 Frontend
// Loaded asynchronously; the review page never waits for comments.
// Requires: window.COMMENTS_CONFIG = { apiBase, turnstileSiteKey }
// Usage: WretVisionComments.init(reviewSlug, containerId)

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  var cfg      = window.COMMENTS_CONFIG || {};
  var API_BASE = (cfg.apiBase || '').replace(/\/$/, '');
  var SITE_KEY = cfg.turnstileSiteKey || '';
  var LIMIT    = 20;
  var OFFICIAL = 'wretvision';

  var REPORT_REASONS = [
    { value: 'spam',          label: 'SPAM'             },
    { value: 'harassment',    label: 'HARASSMENT'       },
    { value: 'spoiler',       label: 'UNMARKED SPOILER' },
    { value: 'inappropriate', label: 'INAPPROPRIATE'    },
    { value: 'other',         label: 'OTHER'            },
  ];

  // ── STATE ───────────────────────────────────────────────────────────────────
  var s = {
    slug:             '',
    containerId:      '',
    allComments:      [],
    total:            0,
    page:             0,
    hasMore:          false,
    loading:          false,
    sort:             'new',
    composerToken:    null,
    composerWidgetId: null,
    reportToken:      null,
    reportWidgetId:   null,
    reportingId:      null,
  };

  // ── UTILITIES ───────────────────────────────────────────────────────────────

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function reltime(iso) {
    if (!iso) return '';
    var diff = Date.now() - new Date(iso).getTime();
    var m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    var d = Math.floor(h / 24);
    if (d < 30) return d + 'd ago';
    var mo = Math.floor(d / 30);
    if (mo < 12) return mo + 'mo ago';
    return Math.floor(mo / 12) + 'y ago';
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(name || '??').slice(0, 2).toUpperCase();
  }

  var AV_COLORS = ['#0a8fd4', '#4fffb0', '#7a5af8', '#e07b20', '#4a9e6b', '#c04b7a'];
  function avatarColor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = ((h * 31) + name.charCodeAt(i)) >>> 0;
    return AV_COLORS[h % AV_COLORS.length];
  }

  function isOfficial(name) {
    return name && name.toLowerCase().replace(/[\s_-]/g, '') === OFFICIAL;
  }

  function $id(id)       { return document.getElementById(id); }
  function $(sel, root)  { return (root || document).querySelector(sel); }

  function showMsg(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className   = 'rvc-form-msg' + (type ? ' rvc-form-msg--' + type : '');
  }

  // ── SORT ────────────────────────────────────────────────────────────────────

  function sortedComments() {
    var arr = s.allComments.slice();
    if (s.sort === 'old') {
      arr.sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
    } else if (s.sort === 'top') {
      arr.sort(function (a, b) {
        return (b.replies ? b.replies.length : 0) - (a.replies ? a.replies.length : 0);
      });
    }
    // 'new' keeps API order (newest first per page)
    return arr;
  }

  // ── BUILD HTML ──────────────────────────────────────────────────────────────

  function buildSkeletonCard() {
    return '<div class="rvc-skeleton-card" aria-hidden="true">' +
      '<div class="rvc-skeleton rvc-skeleton-avatar"></div>' +
      '<div class="rvc-skeleton-content">' +
        '<div class="rvc-skeleton" style="width:32%;height:10px;"></div>' +
        '<div class="rvc-skeleton" style="width:88%;height:10px;"></div>' +
        '<div class="rvc-skeleton" style="width:65%;height:10px;"></div>' +
      '</div>' +
    '</div>';
  }

  function buildComment(c, isReply) {
    var official   = isOfficial(c.display_name);
    var avatarStyle = official ? '' : ' style="background:' + avatarColor(c.display_name || '') + '"';
    var avatarClass = 'rvc-avatar' + (official ? ' rvc-avatar--official' : '');
    var cardClass   = 'rvc-card' +
      (isReply    ? ' rvc-card--reply'   : '') +
      (c.is_deleted ? ' rvc-card--deleted' : '');
    var nameClass  = 'rvc-name' + (official ? ' rvc-name--official' : '');

    // Header
    var header = '<div class="rvc-card-header">' +
      '<span class="' + nameClass + '">' + c.display_name + '</span>';
    if (official) header += ' <span class="rvc-badge rvc-badge--owner" aria-label="Owner">OWNER</span>';
    if (c.is_spoiler && !c.is_deleted) header += ' <span class="rvc-badge rvc-badge--spoiler">SPOILER</span>';
    header += '<time class="rvc-time" datetime="' + esc(c.created_at || '') + '" title="' + esc(c.created_at || '') + '">' +
      reltime(c.created_at) + '</time>';
    if (c.is_edited && !c.is_deleted) header += ' <span class="rvc-badge rvc-badge--edited">EDITED</span>';
    header += '</div>';

    // Body
    var bodyHtml;
    if (c.is_deleted) {
      bodyHtml = '<div class="rvc-body rvc-body--deleted">[deleted]</div>';
    } else if (c.is_spoiler) {
      bodyHtml =
        '<div class="rvc-spoiler-wrap">' +
          '<button class="rvc-spoiler-btn" data-spoiler="' + c.id + '" aria-expanded="false">' +
            '⚠ SPOILER — CLICK TO REVEAL' +
          '</button>' +
          '<div class="rvc-body rvc-spoiler-content" id="rvc-body-' + c.id + '" aria-hidden="true">' +
            c.body +
          '</div>' +
        '</div>';
    } else {
      bodyHtml = '<div class="rvc-body">' + c.body + '</div>';
    }

    // Actions
    var actions = '';
    if (!c.is_deleted) {
      actions = '<div class="rvc-actions">';
      if (!isReply) {
        actions += '<button class="rvc-btn rvc-reply-btn" data-reply="' + c.id +
          '" aria-label="Reply to ' + esc(c.display_name) + '">REPLY</button>';
      }
      actions += '<button class="rvc-btn rvc-report-btn" data-report="' + c.id +
        '" aria-label="Report comment">REPORT</button>';
      actions += '</div>';
    }

    // Inline reply form placeholder (top-level only)
    var replyForm = !isReply
      ? '<div class="rvc-reply-composer" id="rvc-reply-' + c.id + '" hidden>' +
          buildComposerForm('rvc-rf-' + c.id, true, c.id) +
        '</div>'
      : '';

    // Replies
    var replies = '';
    if (!isReply && c.replies && c.replies.length) {
      replies = '<div class="rvc-replies" aria-label="' + c.replies.length + ' repl' +
        (c.replies.length === 1 ? 'y' : 'ies') + '">' +
        c.replies.map(function (r) { return buildComment(r, true); }).join('') +
      '</div>';
    }

    return '<article class="' + cardClass + '" data-id="' + c.id +
        '" role="article" aria-label="Comment by ' + esc(c.display_name) + '">' +
      '<div class="' + avatarClass + '"' + avatarStyle + ' aria-hidden="true">' +
        esc(initials(c.display_name)) +
      '</div>' +
      '<div class="rvc-main">' +
        header + bodyHtml + actions + replyForm + replies +
      '</div>' +
    '</article>';
  }

  function buildComposerForm(formId, isReply, parentId) {
    var tsId = formId + '-ts';
    return '<form class="rvc-form" id="' + esc(formId) + '" novalidate>' +
      '<div class="rvc-fields">' +
        '<input type="text" class="rvc-input rvc-name-input"' +
          ' placeholder="YOUR NAME"' +
          ' maxlength="50" autocomplete="nickname"' +
          ' aria-label="Your display name" required />' +
        '<div class="rvc-body-wrap">' +
          '<textarea class="rvc-input rvc-body-input"' +
            ' placeholder="' + (isReply ? 'WRITE YOUR REPLY...' : 'LEAVE A COMMENT...') + '"' +
            ' maxlength="2000" rows="' + (isReply ? '3' : '4') + '"' +
            ' aria-label="Comment text" required></textarea>' +
          '<span class="rvc-char-count" aria-live="polite">0 / 2000</span>' +
        '</div>' +
      '</div>' +
      '<div class="rvc-form-footer">' +
        '<label class="rvc-spoiler-label">' +
          '<input type="checkbox" class="rvc-spoiler-check" />' +
          '<span class="rvc-spoiler-label-text">SPOILER</span>' +
        '</label>' +
        '<div class="rvc-ts-widget" id="' + esc(tsId) + '"></div>' +
        '<button type="submit" class="page-btn rvc-submit-btn"' +
          ' data-parent-id="' + (parentId || '') + '">' +
          (isReply ? 'POST REPLY ►' : 'POST ►') +
        '</button>' +
      '</div>' +
      '<div class="rvc-form-msg" role="status" aria-live="polite"></div>' +
    '</form>';
  }

  function buildSection() {
    return '<section class="rvc-section" aria-label="Comments">' +
      '<div class="rvc-header-row">' +
        '<div class="rvc-heading">' +
          '<span class="col-header" style="margin-bottom:0">COMMENTS</span>' +
          '<span class="rvc-count" id="rvc-count"></span>' +
        '</div>' +
        '<div class="rvc-sort" role="group" aria-label="Sort comments">' +
          '<span class="rvc-sort-label" aria-hidden="true">SORT:</span>' +
          '<button class="rvc-sort-btn filter-btn active" data-sort="new">NEWEST</button>' +
          '<button class="rvc-sort-btn filter-btn" data-sort="old">OLDEST</button>' +
          '<button class="rvc-sort-btn filter-btn" data-sort="top">TOP</button>' +
        '</div>' +
      '</div>' +
      '<div class="rvc-composer">' +
        '<span class="rvc-composer-label">LEAVE A COMMENT</span>' +
        buildComposerForm('rvc-main-form', false, null) +
      '</div>' +
      '<div class="rvc-list" id="rvc-list" aria-live="polite"></div>' +
      '<div class="rvc-loadmore-row" id="rvc-loadmore-row" hidden>' +
        '<button class="page-btn rvc-loadmore-btn" id="rvc-loadmore-btn">LOAD MORE</button>' +
      '</div>' +
      '<div class="rvc-offline-msg" id="rvc-offline" hidden role="alert">' +
        '<span class="rvc-offline-text">// CONNECTION ERROR — COMMENTS UNAVAILABLE</span>' +
        '<button class="filter-btn" id="rvc-retry" style="font-size:13px">RETRY</button>' +
      '</div>' +
    '</section>';
  }

  function buildEmpty() {
    return '<div class="rvc-empty" role="status">' +
      '<span class="rvc-empty-icon">// _</span>' +
      '<p class="rvc-empty-text">NO COMMENTS YET. BE THE FIRST.</p>' +
    '</div>';
  }

  function buildReportModal() {
    var radios = REPORT_REASONS.map(function (r) {
      return '<label class="rvc-reason-label">' +
        '<input type="radio" class="rvc-reason-radio" name="rvc-reason" value="' + esc(r.value) + '" />' +
        '<span>' + esc(r.label) + '</span>' +
      '</label>';
    }).join('');

    return '<div class="rvc-backdrop" id="rvc-backdrop" role="dialog" aria-modal="true" aria-labelledby="rvc-modal-title">' +
      '<div class="rvc-modal">' +
        '<div class="pixel-corner pc-tl"></div><div class="pixel-corner pc-tr"></div>' +
        '<div class="pixel-corner pc-bl"></div><div class="pixel-corner pc-br"></div>' +
        '<h2 class="rvc-modal-title" id="rvc-modal-title">REPORT COMMENT</h2>' +
        '<p class="rvc-modal-hint">SELECT A REASON:</p>' +
        '<div class="rvc-reasons" role="radiogroup" aria-label="Report reason">' + radios + '</div>' +
        '<div class="rvc-ts-report" id="rvc-ts-report"></div>' +
        '<div class="rvc-modal-actions">' +
          '<button class="page-btn" id="rvc-modal-cancel">CANCEL</button>' +
          '<button class="page-btn" id="rvc-modal-submit">SUBMIT REPORT</button>' +
        '</div>' +
        '<div class="rvc-form-msg" id="rvc-modal-msg" role="status" aria-live="polite"></div>' +
      '</div>' +
    '</div>';
  }

  // ── FETCH ───────────────────────────────────────────────────────────────────

  async function fetchPage() {
    if (s.loading) return;
    s.loading = true;

    var nextPage = s.page + 1;
    var url = API_BASE + '/api/comments?slug=' + encodeURIComponent(s.slug) +
      '&page=' + nextPage + '&limit=' + LIMIT;

    try {
      var res  = await fetch(url);
      var data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Request failed');

      s.page  = data.page || nextPage;
      s.total = typeof data.total === 'number' ? data.total : s.total;

      var incoming = data.comments || [];
      s.allComments = s.allComments.concat(incoming);
      s.hasMore     = s.allComments.length < s.total;

      var offlineEl = $id('rvc-offline');
      if (offlineEl) offlineEl.hidden = true;

      updateCount();
      renderList();
      updateLoadMore();

    } catch (err) {
      console.warn('[WretVision Comments]', err.message);
      if (s.page === 0) {
        // First load failed
        var listEl = $id('rvc-list');
        if (listEl) listEl.innerHTML = '';
        var offEl = $id('rvc-offline');
        if (offEl) offEl.hidden = false;
      }
    } finally {
      s.loading = false;
    }
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────

  function updateCount() {
    var el = $id('rvc-count');
    if (el) el.textContent = '(' + s.total + ')';
  }

  function renderList() {
    var listEl = $id('rvc-list');
    if (!listEl) return;
    var sorted = sortedComments();
    listEl.innerHTML = sorted.length
      ? sorted.map(function (c) { return buildComment(c, false); }).join('')
      : buildEmpty();
  }

  function renderSkeleton() {
    var listEl = $id('rvc-list');
    if (listEl) listEl.innerHTML = buildSkeletonCard() + buildSkeletonCard() + buildSkeletonCard();
  }

  function updateLoadMore() {
    var row = $id('rvc-loadmore-row');
    if (row) row.hidden = !s.hasMore;
    var btn = $id('rvc-loadmore-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'LOAD MORE'; }
  }

  // ── SPOILER ─────────────────────────────────────────────────────────────────

  function toggleSpoiler(commentId) {
    var bodyEl = $id('rvc-body-' + commentId);
    var btnEl  = $('[data-spoiler="' + commentId + '"]');
    if (!bodyEl || !btnEl) return;
    var revealed = bodyEl.classList.contains('rvc-spoiler-revealed');
    bodyEl.classList.toggle('rvc-spoiler-revealed', !revealed);
    bodyEl.setAttribute('aria-hidden', revealed ? 'true' : 'false');
    btnEl.setAttribute('aria-expanded', revealed ? 'false' : 'true');
  }

  // ── REPLY FORM ───────────────────────────────────────────────────────────────

  function toggleReplyForm(commentId, container) {
    var formWrap = $id('rvc-reply-' + commentId);
    if (!formWrap) return;
    var isHidden = formWrap.hidden;

    // Close any other open reply forms first
    container.querySelectorAll('.rvc-reply-composer:not([hidden])').forEach(function (el) {
      el.hidden = true;
    });

    if (isHidden) {
      formWrap.hidden = false;
      var nameInput = formWrap.querySelector('.rvc-name-input');
      if (nameInput) nameInput.focus();
      initTurnstileInForm(formWrap);
    }
  }

  // ── TURNSTILE ────────────────────────────────────────────────────────────────

  function waitForTurnstile(cb, tries) {
    tries = tries || 0;
    if (window.turnstile) { cb(); return; }
    if (tries < 100) setTimeout(function () { waitForTurnstile(cb, tries + 1); }, 100);
  }

  function initMainTurnstile(container) {
    var tsEl = container.querySelector('#rvc-main-form-ts');
    if (!tsEl) return;

    if (!SITE_KEY) {
      tsEl.innerHTML = '<span style="font-family:\'VT323\',monospace;font-size:15px;' +
        'color:var(--muted);letter-spacing:1px;">// CAPTCHA NOT CONFIGURED</span>';
      return;
    }

    waitForTurnstile(function () {
      if (!window.turnstile) return;
      s.composerWidgetId = window.turnstile.render(tsEl, {
        sitekey:            SITE_KEY,
        theme:              'dark',
        callback:           function (tok) { s.composerToken = tok; },
        'expired-callback': function ()    { s.composerToken = null; },
        'error-callback':   function ()    { s.composerToken = null; },
      });
    });
  }

  function initTurnstileInForm(formWrap) {
    var tsEl = formWrap.querySelector('.rvc-ts-widget');
    if (!tsEl || tsEl.dataset.rendered || !SITE_KEY) return;
    tsEl.dataset.rendered = '1';
    waitForTurnstile(function () {
      if (!window.turnstile) return;
      var wid = window.turnstile.render(tsEl, {
        sitekey:            SITE_KEY,
        theme:              'dark',
        callback:           function (tok) { tsEl.dataset.token = tok; },
        'expired-callback': function ()    { delete tsEl.dataset.token; },
        'error-callback':   function ()    { delete tsEl.dataset.token; },
      });
      tsEl.dataset.widgetId = wid;
    });
  }

  function resetTurnstileInForm(formEl, isMainForm) {
    if (!window.turnstile) return;
    if (isMainForm) {
      if (s.composerWidgetId != null) window.turnstile.reset(s.composerWidgetId);
      s.composerToken = null;
    } else {
      var tsEl = formEl.querySelector('.rvc-ts-widget');
      if (tsEl && tsEl.dataset.widgetId) window.turnstile.reset(tsEl.dataset.widgetId);
      if (tsEl) delete tsEl.dataset.token;
    }
  }

  // ── SUBMIT COMMENT ───────────────────────────────────────────────────────────

  async function submitComment(formEl) {
    var nameEl    = formEl.querySelector('.rvc-name-input');
    var bodyEl    = formEl.querySelector('.rvc-body-input');
    var spoilerEl = formEl.querySelector('.rvc-spoiler-check');
    var submitBtn = formEl.querySelector('.rvc-submit-btn');
    var msgEl     = formEl.querySelector('.rvc-form-msg');
    var tsEl      = formEl.querySelector('.rvc-ts-widget');
    var isMain    = formEl.id === 'rvc-main-form';

    var name    = nameEl  ? nameEl.value.trim()   : '';
    var body    = bodyEl  ? bodyEl.value.trim()    : '';
    var spoiler = spoilerEl ? spoilerEl.checked    : false;
    var parentId = submitBtn
      ? (parseInt(submitBtn.dataset.parentId, 10) || null)
      : null;

    // Client validation
    if (name.length < 2) {
      showMsg(msgEl, '// NAME REQUIRED (MIN 2 CHARS)', 'error');
      if (nameEl) nameEl.focus();
      return;
    }
    if (body.length < 3) {
      showMsg(msgEl, '// COMMENT TOO SHORT (MIN 3 CHARS)', 'error');
      if (bodyEl) bodyEl.focus();
      return;
    }

    // Turnstile token
    var token = isMain ? s.composerToken : (tsEl ? tsEl.dataset.token : null);
    if (SITE_KEY && !token) {
      showMsg(msgEl, '// PLEASE COMPLETE THE CAPTCHA', 'error');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    showMsg(msgEl, '// POSTING...', 'info');

    try {
      var payload = {
        review_slug:           s.slug,
        display_name:          name,
        body:                  body,
        is_spoiler:            spoiler,
        cf_turnstile_response: token || '',
      };
      if (parentId) payload.parent_id = parentId;

      var res  = await fetch(API_BASE + '/api/comments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      var data = await res.json();

      if (!res.ok) {
        showMsg(msgEl, '// ' + (data.error || 'SUBMISSION FAILED'), 'error');
        resetTurnstileInForm(formEl, isMain);
        return;
      }

      // Success
      showMsg(msgEl, parentId ? '// REPLY POSTED' : '// COMMENT POSTED', 'success');
      if (nameEl)    nameEl.value    = '';
      if (bodyEl)    bodyEl.value    = '';
      if (spoilerEl) spoilerEl.checked = false;
      var counter = formEl.querySelector('.rvc-char-count');
      if (counter) counter.textContent = '0 / 2000';
      resetTurnstileInForm(formEl, isMain);

      // Reload thread so new comment/reply appears
      setTimeout(function () {
        s.page        = 0;
        s.allComments = [];
        s.total       = 0;
        s.hasMore     = false;
        fetchPage();
      }, 800);

      // Collapse reply form after reload
      if (parentId) {
        var wrap = $id('rvc-reply-' + parentId);
        if (wrap) setTimeout(function () { wrap.hidden = true; }, 1000);
      }

    } catch (e) {
      showMsg(msgEl, '// NETWORK ERROR — TRY AGAIN', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // ── REPORT ───────────────────────────────────────────────────────────────────

  function openReport(commentId) {
    if ($id('rvc-backdrop')) return;
    s.reportingId  = commentId;
    s.reportToken  = null;
    s.reportWidgetId = null;

    var frag = document.createElement('div');
    frag.innerHTML = buildReportModal();
    document.body.appendChild(frag.firstChild);

    // Default-select first radio
    var firstRadio = $('[name="rvc-reason"]');
    if (firstRadio) firstRadio.checked = true;

    // Turnstile for report
    if (SITE_KEY) {
      waitForTurnstile(function () {
        var tsEl = $id('rvc-ts-report');
        if (!tsEl || !window.turnstile) return;
        s.reportWidgetId = window.turnstile.render(tsEl, {
          sitekey:            SITE_KEY,
          theme:              'dark',
          callback:           function (tok) { s.reportToken = tok; },
          'expired-callback': function ()    { s.reportToken = null; },
          'error-callback':   function ()    { s.reportToken = null; },
        });
      });
    }

    // Focus cancel button
    var cancelBtn = $id('rvc-modal-cancel');
    if (cancelBtn) cancelBtn.focus();

    // Keyboard ESC
    function onKey(e) {
      if (e.key === 'Escape') { closeReport(); document.removeEventListener('keydown', onKey); }
    }
    document.addEventListener('keydown', onKey);

    // Backdrop click
    var backdrop = $id('rvc-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) closeReport();
      });
    }

    // Buttons
    if (cancelBtn) cancelBtn.addEventListener('click', closeReport);

    var submitBtn = $id('rvc-modal-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        var checked = $('[name="rvc-reason"]:checked');
        doSubmitReport(checked ? checked.value : 'other');
      });
    }
  }

  function closeReport() {
    var backdrop = $id('rvc-backdrop');
    if (!backdrop) return;
    if (s.reportWidgetId != null && window.turnstile) {
      try { window.turnstile.remove(s.reportWidgetId); } catch (_) {}
    }
    s.reportWidgetId = null;
    s.reportToken    = null;
    s.reportingId    = null;
    backdrop.remove();
  }

  async function doSubmitReport(reason) {
    if (!s.reportingId) return;
    if (SITE_KEY && !s.reportToken) {
      showMsg($id('rvc-modal-msg'), '// PLEASE COMPLETE THE CAPTCHA', 'error');
      return;
    }

    var submitBtn = $id('rvc-modal-submit');
    var cancelBtn = $id('rvc-modal-cancel');
    if (submitBtn) submitBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    showMsg($id('rvc-modal-msg'), '// SUBMITTING...', 'info');

    try {
      var res  = await fetch(API_BASE + '/api/comments/report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_id:            s.reportingId,
          reason:                reason,
          cf_turnstile_response: s.reportToken || '',
        }),
      });
      var data = await res.json();

      if (!res.ok) {
        showMsg($id('rvc-modal-msg'), '// ' + (data.error || 'REPORT FAILED'), 'error');
        if (submitBtn) submitBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (s.reportWidgetId != null && window.turnstile) window.turnstile.reset(s.reportWidgetId);
        s.reportToken = null;
        return;
      }

      showMsg($id('rvc-modal-msg'), '// REPORT SUBMITTED. THANK YOU.', 'success');
      setTimeout(closeReport, 1600);

    } catch (_) {
      showMsg($id('rvc-modal-msg'), '// NETWORK ERROR — TRY AGAIN', 'error');
      if (submitBtn) submitBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    }
  }

  // ── EVENT DELEGATION ─────────────────────────────────────────────────────────

  function bindEvents(container) {

    // Click delegation
    container.addEventListener('click', function (e) {

      // Sort
      var sortBtn = e.target.closest('.rvc-sort-btn');
      if (sortBtn) {
        var newSort = sortBtn.dataset.sort;
        if (newSort === s.sort) return;
        s.sort = newSort;
        container.querySelectorAll('.rvc-sort-btn').forEach(function (b) {
          b.classList.toggle('active', b.dataset.sort === s.sort);
        });
        renderList();
        return;
      }

      // Spoiler reveal
      var spoilerBtn = e.target.closest('.rvc-spoiler-btn');
      if (spoilerBtn) { toggleSpoiler(spoilerBtn.dataset.spoiler); return; }

      // Reply
      var replyBtn = e.target.closest('.rvc-reply-btn');
      if (replyBtn) { toggleReplyForm(replyBtn.dataset.reply, container); return; }

      // Report
      var reportBtn = e.target.closest('.rvc-report-btn');
      if (reportBtn) {
        openReport(parseInt(reportBtn.dataset.report, 10));
        return;
      }

      // Load more
      var loadMoreBtn = e.target.closest('#rvc-loadmore-btn');
      if (loadMoreBtn) {
        loadMoreBtn.disabled    = true;
        loadMoreBtn.textContent = 'LOADING...';
        fetchPage();
        return;
      }

      // Retry after error
      var retryBtn = e.target.closest('#rvc-retry');
      if (retryBtn) {
        var offEl = $id('rvc-offline');
        if (offEl) offEl.hidden = true;
        renderSkeleton();
        fetchPage();
        return;
      }
    });

    // Form submission
    container.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target;
      if (form.classList.contains('rvc-form')) submitComment(form);
    });

    // Live character counter
    container.addEventListener('input', function (e) {
      var ta = e.target.closest('.rvc-body-input');
      if (!ta) return;
      var len    = ta.value.length;
      var max    = parseInt(ta.getAttribute('maxlength'), 10) || 2000;
      var ctr    = ta.closest('.rvc-body-wrap') &&
                   ta.closest('.rvc-body-wrap').querySelector('.rvc-char-count');
      if (ctr) {
        ctr.textContent = len + ' / ' + max;
        ctr.classList.toggle('rvc-near-limit', len > max * 0.9);
      }
    });
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────

  function init() {
    var container = $id(s.containerId);
    if (!container) return;

    container.innerHTML = buildSection();
    renderSkeleton();
    bindEvents(container);
    initMainTurnstile(container);
    fetchPage();
  }

  // ── PUBLIC API ───────────────────────────────────────────────────────────────

  window.WretVisionComments = {
    init: function (slug, containerId) {
      if (!slug || !containerId) return;
      s.slug        = slug;
      s.containerId = containerId;
      init();
    },
  };

}());
