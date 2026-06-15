/* sines.js — canvas 2D + GSAP animated sine waves
   Replaces static SVG .sine-deco elements with crisp, animated canvas equivalents.
   Requires GSAP (global) to be loaded before this script. */
(function () {
  'use strict';

  if (typeof gsap === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* Read stroke colour from CSS custom property so dark-mode overrides work */
  var sineRgb = (getComputedStyle(document.documentElement)
    .getPropertyValue('--sine-rgb').trim()) || '26,26,26';

  /* Pause animation when tab is hidden to save CPU/battery */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { gsap.ticker.sleep(); } else { gsap.ticker.wake(); }
  });

  /* Wave presets — one per .sine-deco in document order.
     fy   : vertical centre as fraction of canvas height (0–1)
     amp  : amplitude in px
     fr   : frequency (full cycles across canvas width)
     ph   : initial phase (radians)
     spd  : duration per cycle (seconds) — lower = faster
     op   : stroke opacity (0–1)
     lw   : stroke-width
     dash : stroke-dasharray ([gap, space] or [] for solid)  */
  var CONFIGS = [
    /* 0 — after hero */
    [
      { fy:.24, amp:22, fr:2.1, ph:0.0, spd:9,  op:.23, lw:.85, dash:[2,14] },
      { fy:.40, amp:30, fr:1.7, ph:1.2, spd:12, op:.55, lw:.85, dash:[] },
      { fy:.56, amp:14, fr:2.8, ph:2.4, spd:7,  op:.10, lw:.85, dash:[2,7]  },
      { fy:.76, amp:36, fr:1.3, ph:0.8, spd:16, op:.08, lw:.85, dash:[] },
    ],
    /* 1 — after about */
    [
      { fy:.23, amp:18, fr:1.9, ph:.5,  spd:11, op:.33, lw:.85, dash:[2,14] },
      { fy:.44, amp:16, fr:2.4, ph:1.8, spd:8,  op:.33, lw:.85, dash:[2,14] },
      { fy:.68, amp:24, fr:1.5, ph:.2,  spd:14, op:.26, lw:.85, dash:[2,7]  },
    ],
    /* 2 — before process (SINE C) */
    [
      { fy:.20, amp:24, fr:2.0, ph:1.0, spd:10, op:.29, lw:.85, dash:[] },
      { fy:.37, amp:38, fr:1.4, ph:2.2, spd:13, op:.65, lw:.85, dash:[2,14] },
      { fy:.54, amp:16, fr:2.5, ph:.6,  spd:7,  op:.34, lw:.85, dash:[2,7]  },
      { fy:.70, amp:42, fr:1.1, ph:1.4, spd:18, op:.11, lw:.85, dash:[] },
      { fy:.85, amp:12, fr:2.3, ph:3.0, spd:9,  op:.10, lw:.85, dash:[] },
    ],
    /* 3 — after process (SINE D) */
    [
      { fy:.28, amp:12, fr:2.2, ph:.3,  spd:9,  op:.12, lw:.85, dash:[2,7]  },
      { fy:.50, amp:20, fr:1.8, ph:1.5, spd:11, op:.09, lw:.85, dash:[] },
      { fy:.72, amp:30, fr:1.5, ph:2.8, spd:14, op:.38, lw:.85, dash:[2,7]  },
    ],
    /* 4 — before footer (SINE E) */
    [
      { fy:.30, amp:14, fr:1.9, ph:.8,  spd:8,  op:.16, lw:.85, dash:[] },
      { fy:.52, amp:18, fr:2.1, ph:1.6, spd:10, op:.08, lw:.85, dash:[2,14] },
      { fy:.72, amp:22, fr:1.7, ph:2.5, spd:12, op:.27, lw:.85, dash:[2,7]  },
    ],
  ];

  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  document.querySelectorAll('.sine-deco').forEach(function (deco, idx) {
    /* Grab height from original SVG viewBox before clearing */
    var svg = deco.querySelector('svg');
    var vb  = svg ? (svg.getAttribute('viewBox') || '').split(' ') : [];
    var H   = Math.max(parseInt(vb[3], 10) || 90, 1);

    /* Replace SVG with canvas */
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.display = 'block';
    deco.innerHTML = '';
    deco.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var W   = 0;

    /* Clone wave config so we can mutate ph safely */
    var waves = CONFIGS[idx % CONFIGS.length].map(function (w) {
      return Object.assign({}, w);
    });

    function resize() {
      W = deco.offsetWidth || window.innerWidth;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.scale(dpr, dpr);   /* canvas.width assignment resets transform */
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      waves.forEach(function (w) {
        ctx.beginPath();
        ctx.setLineDash(w.dash);
        ctx.lineWidth     = w.lw;
        ctx.strokeStyle   = 'rgba(' + sineRgb + ',' + w.op + ')';
        ctx.lineCap       = 'round';
        ctx.lineJoin      = 'round';
        for (var x = 0; x <= W; x += 2) {
          var y = H * w.fy + w.amp * Math.sin((x / W) * Math.PI * 2 * w.fr + w.ph);
          if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
      });
    }

    /* Animate each wave's phase continuously */
    waves.forEach(function (w) {
      gsap.to(w, {
        ph: w.ph + Math.PI * 2,
        duration: w.spd,
        repeat: -1,
        ease: 'none',
      });
    });

    resize();

    /* Redraw on every GSAP tick (already synced to rAF) */
    gsap.ticker.add(draw);

    /* Redraw on resize */
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () { resize(); }).observe(deco);
    } else {
      window.addEventListener('resize', function () { resize(); });
    }
  });
}());
