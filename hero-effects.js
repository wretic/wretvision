/* hero-effects.js — rain + lightning for all pages
   Colour config via window.HERO_FX before this script loads:
     HERO_FX.glowColor   — bolt glow rgba string
     HERO_FX.shadowColor — bolt shadow rgba string
     HERO_FX.flashColor  — hero-flash background colour
*/
(function () {
  var cfg         = window.HERO_FX || {};
  var glowColor   = cfg.glowColor   || 'rgba(120,190,255,0.30)';
  var shadowColor = cfg.shadowColor || 'rgba(100,180,255,1)';
  var flashColor  = cfg.flashColor  || null;

  /* ── LIGHTNING ─────────────────────────────────────────────── */
  var canvas = document.getElementById('hero-lightning-canvas');
  var flash  = document.getElementById('hero-flash');

  if (canvas && flash && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

    if (flashColor) flash.style.background = flashColor;

    var ctx   = canvas.getContext('2d');
    var CYCLE = 60000;

    function resize() {
      var hero    = canvas.parentElement;
      canvas.width  = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function segment(x1, y1, x2, y2, disp) {
      if (disp < 2) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); return; }
      var dist = Math.hypot(x2 - x1, y2 - y1);
      var mx   = (x1 + x2) / 2;
      var my   = (y1 + y2) / 2;
      var px   = -(y2 - y1) / dist;
      var py   =  (x2 - x1) / dist;
      var off  = (Math.random() - 0.5) * disp;
      mx += px * off;
      my += py * off;
      segment(x1, y1, mx, my, disp / 2);
      segment(mx, my, x2, y2, disp / 2);
    }

    function drawBolt(sx, sy, ex, ey, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth   = 8;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur  = 28;
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      segment(sx, sy, ex, ey, 90);
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(220,240,255,0.95)';
      ctx.lineWidth   = 1.5;
      ctx.shadowBlur  = 10;
      segment(sx, sy, ex, ey, 90);
      ctx.stroke();

      ctx.restore();
    }

    function strike(alpha) {
      var w  = canvas.width;
      var h  = canvas.height;
      var sx = w * (0.72 + Math.random() * 0.08);
      var sy = h * 0.02;
      var ex = sx + (Math.random() - 0.5) * w * 0.08;
      var ey = h * (0.55 + Math.random() * 0.18);
      ctx.clearRect(0, 0, w, h);
      drawBolt(sx, sy, ex, ey, alpha);
      flash.style.opacity = (0.20 * alpha).toFixed(2);
      setTimeout(function () {
        ctx.clearRect(0, 0, w, h);
        flash.style.opacity = '0';
      }, 75);
    }

    function runCycle() {
      strike(1.0);
      setTimeout(function () { strike(0.75); }, 160);
      setTimeout(function () { strike(0.50); }, 300);
    }

    setTimeout(function () {
      runCycle();
      setInterval(runCycle, CYCLE);
    }, 2000 + Math.random() * 3000);

    window.__lightning = runCycle;
  }

  /* ── RAIN ───────────────────────────────────────────────────── */
  var rain = document.querySelector('.hero-rain');
  if (rain && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (var i = 0; i < 65; i++) {
      var d = document.createElement('div');
      d.className = 'rain-drop';
      d.style.left              = (Math.random() * 102) + '%';
      d.style.height            = (Math.random() * 35 + 25) + 'px';
      d.style.opacity           = (Math.random() * 0.35 + 0.08).toFixed(2);
      d.style.animationDuration = (Math.random() * 0.5 + 0.55).toFixed(2) + 's';
      d.style.animationDelay    = '-' + (Math.random() * 2).toFixed(2) + 's';
      rain.appendChild(d);
    }
  }

})();
