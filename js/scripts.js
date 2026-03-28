(function () {
  'use strict';

  // ── Element references ───────────────────────────────────
  const cur        = document.getElementById('cursor');
  const curR       = document.getElementById('cursorRing');
  const rain       = document.getElementById('matrix-rain');
  const loaderEl   = document.getElementById('loader');
  const loaderText = document.getElementById('loader-text');
  const viewport   = document.getElementById('viewport');
  const hamburger  = document.getElementById('hamburger');
  const progressEl = document.getElementById('progress');
  const coordsEl   = document.getElementById('coords');
  const hintEl     = document.getElementById('scroll-hint');
  const menu       = document.getElementById('side-menu');

  // ── Custom cursor ────────────────────────────────────────
  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    cur.style.left = mx + 'px';
    cur.style.top  = my + 'px';
  });

  (function animCursor() {
    rx += (mx - rx) * 0.1;
    ry += (my - ry) * 0.1;
    curR.style.left = rx + 'px';
    curR.style.top  = ry + 'px';
    requestAnimationFrame(animCursor);
  })();

  document.querySelectorAll('a, button, .pdot, #hamburger, .proj-card, .pill').forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      cur.style.width  = '16px';
      cur.style.height = '16px';
      curR.style.transform = 'translate(-50%,-50%) scale(1.5)';
    });
    el.addEventListener('mouseleave', function () {
      cur.style.width  = '10px';
      cur.style.height = '10px';
      curR.style.transform = 'translate(-50%,-50%) scale(1)';
    });
  });

  // ── Matrix Rain ──────────────────────────────────────────
  const rctx  = rain.getContext('2d');
  const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>/{}[]();';
  let cols, drops, rainTimer;

  function initDrops() {
    cols  = Math.floor(rain.width / 16);
    // Each column starts at a random negative row (above the canvas).
    // They "enter" the screen from the top at different times, so the screen
    // fills up column by column instead of appearing as a pre-filled block.
    drops = Array(cols).fill(0).map(function () {
      return -Math.floor(Math.random() * 35);
    });
  }

  function resizeRain() {
    rain.width  = window.innerWidth;
    rain.height = window.innerHeight;
    initDrops();
  }
  resizeRain();
  window.addEventListener('resize', resizeRain);

  function drawRain() {
    rctx.fillStyle = 'rgba(2,12,2,0.055)';
    rctx.fillRect(0, 0, rain.width, rain.height);
    for (let i = 0; i < drops.length; i++) {
      const ch     = CHARS[Math.floor(Math.random() * CHARS.length)];
      const bright = Math.random() > 0.93;
      rctx.font      = (bright ? 'bold ' : '') + '14px monospace';
      rctx.fillStyle = bright ? '#ccffcc' : '#00ff41';
      rctx.globalAlpha = bright ? 0.95 : 0.35 + Math.random() * 0.35;
      rctx.fillText(ch, i * 16, drops[i] * 16);
      rctx.globalAlpha = 1;
      if (drops[i] * 16 > rain.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  // Starts rain gradually: canvas fades from opacity 0 → 0.2 over 4 s,
  // draw interval decreases from 220 ms → 48 ms over 5 s (ease-in).
  function startRain() {
    if (rainTimer) return;
    rain.style.opacity = '0';
    const t0         = Date.now();
    const opDur      = 4000;
    const speedDur   = 5000;
    const speedStart = 220;
    const speedEnd   = 48;

    function loop() {
      const elapsed = Date.now() - t0;

      // Canvas opacity fade-in
      const op = Math.min(elapsed / opDur, 1);
      rain.style.opacity = (op * 0.2).toFixed(4);

      // Speed ramp-up (quadratic ease-in)
      const sp    = Math.min(elapsed / speedDur, 1);
      const eased = sp * sp;
      const delay = Math.round(speedStart - (speedStart - speedEnd) * eased);

      drawRain();

      if (elapsed < speedDur) {
        rainTimer = setTimeout(loop, delay);
      } else {
        rain.style.opacity = '0.2';
        rainTimer = setInterval(drawRain, speedEnd);
      }
    }

    loop();
  }

  // ── Navigation ───────────────────────────────────────────
  const worlds = document.querySelectorAll('.world');
  const pdots  = document.querySelectorAll('.pdot');
  const NAMES  = ['INIT', 'ABOUT', 'STACK', 'XP', 'PROJECTS', 'CONTACT'];
  const TOTAL  = worlds.length;
  let current = 0;
  let transitioning = false;

  function updateUI(idx) {
    pdots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    coordsEl.textContent  = '0' + idx + ' · ' + NAMES[idx];
    hintEl.style.opacity  = idx === TOTAL - 1 ? '0' : '0.8';
  }

  function animateZoom(from, to) {
    if (transitioning) return;
    transitioning = true;

    const fromEl = worlds[from];
    const toEl   = worlds[to];
    const dir    = to > from ? 1 : -1;

    toEl.style.transition    = 'none';
    toEl.style.transform     = dir > 0 ? 'scale(0.0001)' : 'scale(30)';
    toEl.style.opacity       = '0';
    toEl.style.pointerEvents = 'none';
    toEl.classList.add('active');
    toEl.offsetHeight; // force reflow

    fromEl.style.transition = 'transform 0.75s cubic-bezier(0.4,0,1,1), opacity 0.4s ease 0.2s';
    fromEl.style.transform  = dir > 0 ? 'scale(22)' : 'scale(0.0001)';
    fromEl.style.opacity    = '0';

    setTimeout(function () {
      toEl.style.transition = 'transform 0.7s cubic-bezier(0,0,0.3,1), opacity 0.5s ease';
      toEl.style.transform  = 'scale(1)';
      toEl.style.opacity    = '1';
    }, 180);

    setTimeout(function () {
      fromEl.style.transition  = 'none';
      fromEl.style.transform   = 'scale(1)';
      fromEl.style.opacity     = '0';
      fromEl.style.pointerEvents = 'none';
      fromEl.classList.remove('active');
      toEl.style.pointerEvents = 'all';
      current = to;
      updateUI(current);
      transitioning = false;
    }, 950);
  }

  function goTo(idx) {
    if (idx === current || transitioning) return;
    closeMenu();
    animateZoom(current, idx);
  }

  let menuOpen = false;

  function toggleMenu() {
    menuOpen = !menuOpen;
    hamburger.classList.toggle('open', menuOpen);
    menu.classList.toggle('open', menuOpen);
  }

  function closeMenu() {
    menuOpen = false;
    hamburger.classList.remove('open');
    menu.classList.remove('open');
  }

  hamburger.addEventListener('click', toggleMenu);
  menu.addEventListener('click', function (e) { if (e.target === menu) closeMenu(); });

  menu.querySelectorAll('nav a[data-section]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const idx = parseInt(link.getAttribute('data-section'), 10);
      if (!Number.isNaN(idx)) goTo(idx);
    });
  });

  progressEl.addEventListener('click', function (e) {
    const dot = e.target.closest('.pdot');
    if (!dot) return;
    const idx = parseInt(dot.getAttribute('data-section'), 10);
    if (!Number.isNaN(idx)) goTo(idx);
  });

  let wCool = false;
  window.addEventListener('wheel', function (e) {
    if (wCool || transitioning) return;
    const d    = e.deltaY > 0 ? 1 : -1;
    const next = current + d;
    if (next < 0 || next >= TOTAL) return;
    wCool = true;
    goTo(next);
    setTimeout(function () { wCool = false; }, 1100);
  }, { passive: true });

  let tStart = 0, tCool = false;
  window.addEventListener('touchstart', function (e) {
    tStart = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (tCool || transitioning) return;
    const dy   = tStart - e.changedTouches[0].clientY;
    if (Math.abs(dy) < 44) return;
    const d    = dy > 0 ? 1 : -1;
    const next = current + d;
    if (next < 0 || next >= TOTAL) return;
    tCool = true;
    goTo(next);
    setTimeout(function () { tCool = false; }, 1100);
  }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (transitioning) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ')
      goTo(Math.min(current + 1, TOTAL - 1));
    if (e.key === 'ArrowUp' || e.key === 'PageUp')
      goTo(Math.max(current - 1, 0));
  });

  // ── Loader sequence ──────────────────────────────────────
  function typeLine(text, charDelay, onDone) {
    let i = 0;
    (function next() {
      if (i < text.length) {
        loaderText.textContent += text[i++];
        setTimeout(next, charDelay + Math.random() * 28);
      } else if (onDone) {
        onDone();
      }
    })();
  }

  function showHero() {
    startRain();
    viewport.style.transition = 'opacity 1.2s ease';
    viewport.style.opacity    = '1';
    setTimeout(function () {
      hamburger.style.transition  = 'opacity 0.8s ease';
      hamburger.style.opacity     = '1';
      progressEl.style.transition = 'opacity 0.8s ease';
      progressEl.style.opacity    = '1';
      coordsEl.style.transition   = 'opacity 0.8s ease';
      coordsEl.style.opacity      = '1';
      // Remove inline opacity so the CSS hintPulse animation can take over
      hintEl.style.transition     = 'opacity 0.8s ease';
      hintEl.style.opacity        = '0.8';
    }, 700);
  }

  // ── Init ─────────────────────────────────────────────────
  // Set initial nav state (pdots, coords)
  updateUI(0);

  // Hide all chrome while the loader runs — set AFTER updateUI so we win
  viewport.style.opacity    = '0';
  hamburger.style.opacity   = '0';
  progressEl.style.opacity  = '0';
  coordsEl.style.opacity    = '0';
  hintEl.style.opacity      = '0';

  // "Follow the white rabbit..." → pause → "Knock, Knock..." → fade hero in
  typeLine('Follow the white rabbit...', 52, function () {
    setTimeout(function () {
      loaderText.textContent = '';
      setTimeout(function () {
        typeLine('Knock, Knock...', 75, function () {
          setTimeout(function () {
            loaderEl.classList.add('hide');
            setTimeout(showHero, 950);
          }, 1300);
        });
      }, 380);
    }, 1000);
  });

})();
