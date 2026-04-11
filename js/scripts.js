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
  const langSwitch = document.querySelector('.lang-switch');

  const pageLang = (document.documentElement.getAttribute('lang') || 'en').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';

  const SECTION_NAMES = {
    es: ['INICIO', 'SOBRE MÍ', 'STACK', 'EXPERIENCIA', 'PROYECTOS', 'CONTACTO'],
    en: ['INIT', 'ABOUT', 'STACK', 'XP', 'PROJECTS', 'CONTACT'],
  };
  const LOADER_LINES = {
    es: ['Seguí al conejo blanco...', 'Toc, toc...'],
    en: ['Follow the white rabbit...', 'Knock, Knock...'],
  };
  const sectionNames = SECTION_NAMES[pageLang];

  // ── Projects carousel: center active card; peek neighbors; arrows only + smooth slide ─
  (function initProjCarousel() {
    var track = document.getElementById('proj-track');
    var outer = document.getElementById('proj-carousel');
    if (!track || !outer) return;

    var prevBtn = document.querySelector('.proj-nav--prev');
    var nextBtn = document.querySelector('.proj-nav--next');
    var cards = track.children;
    var index = 0;
    var pos = 0;
    var animating = false;

    function trackGapPx() {
      var cs = window.getComputedStyle(track);
      var g = cs.columnGap && cs.columnGap !== 'normal' ? cs.columnGap : cs.gap;
      var n = parseFloat(g) || 20;
      return n;
    }

    /** Aligns card `index` so its horizontal center matches the outer viewport center. */
    function syncPosFromIndex() {
      if (!cards.length) return;
      var cw = cards[0].offsetWidth;
      var gap = trackGapPx();
      var step = cw + gap;
      var outerW = outer.clientWidth;
      pos = outerW / 2 - cw / 2 - index * step;
    }

    function setTransform() {
      track.style.transform = 'translate3d(' + pos + 'px,0,0)';
    }

    function applyImmediate() {
      track.classList.add('proj-track--no-trans');
      syncPosFromIndex();
      setTransform();
      track.offsetHeight;
      track.classList.remove('proj-track--no-trans');
    }

    function updateNavState() {
      var n = cards.length;
      if (prevBtn) prevBtn.disabled = index <= 0;
      if (nextBtn) nextBtn.disabled = n <= 1 || index >= n - 1;
    }

    function go(delta) {
      if (animating) return;
      var n = cards.length;
      var next = index + delta;
      if (next < 0 || next >= n) return;
      animating = true;
      index = next;
      syncPosFromIndex();
      track.classList.remove('proj-track--no-trans');
      setTransform();
      updateNavState();
    }

    track.addEventListener('transitionend', function (e) {
      if (e.target !== track || e.propertyName !== 'transform') return;
      animating = false;
      updateNavState();
    });

    syncPosFromIndex();
    setTransform();
    updateNavState();

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        applyImmediate();
        updateNavState();
      });
    });

    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });

    window.addEventListener('resize', function () {
      applyImmediate();
      updateNavState();
    });
  })();

  // ── Custom cursor ────────────────────────────────────────
  let mx = 0, my = 0, rx = 0, ry = 0;

  /** Shows or hides the dot and ring cursor. */
  function setCursorVisible(visible) {
    cur.classList.toggle('cursor--hidden', !visible);
    curR.classList.toggle('cursor--hidden', !visible);
  }

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    cur.style.left = mx + 'px';
    cur.style.top  = my + 'px';
  });

  document.documentElement.addEventListener('mouseleave', function () {
    setCursorVisible(false);
  });

  document.documentElement.addEventListener('mouseenter', function (e) {
    mx = e.clientX; my = e.clientY;
    rx = mx; ry = my;
    cur.style.left = mx + 'px';
    cur.style.top  = my + 'px';
    curR.style.left = rx + 'px';
    curR.style.top  = ry + 'px';
    setCursorVisible(true);
  });

  /** Smoothly interpolates the ring toward the dot (lerp each frame). */
  (function animCursor() {
    rx += (mx - rx) * 0.1;
    ry += (my - ry) * 0.1;
    curR.style.left = rx + 'px';
    curR.style.top  = ry + 'px';
    requestAnimationFrame(animCursor);
  })();

  document.querySelectorAll('a, button, .pdot, #hamburger, .proj-card, .proj-nav, .pill, .lang-switch__link').forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      cur.style.width  = '1rem';
      cur.style.height = '1rem';
      curR.style.transform = 'translate(-50%,-50%) scale(1.5)';
    });
    el.addEventListener('mouseleave', function () {
      cur.style.width  = '0.625rem';
      cur.style.height = '0.625rem';
      curR.style.transform = 'translate(-50%,-50%) scale(1)';
    });
  });

  // ── Matrix Rain ──────────────────────────────────────────
  const rctx  = rain.getContext('2d');
  const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>/{}[]();';
  let cols, drops, rainTimer;

  /** Rebuilds column count and random start rows so rain enters gradually, not as a solid block. */
  function initDrops() {
    cols  = Math.floor(rain.width / 16);
    drops = Array(cols).fill(0).map(function () {
      return -Math.floor(Math.random() * 35);
    });
  }

  /** Fits the canvas to the viewport and resets drop columns. */
  function resizeRain() {
    rain.width  = window.innerWidth;
    rain.height = window.innerHeight;
    initDrops();
  }
  resizeRain();
  window.addEventListener('resize', resizeRain);

  /** One frame: trail fade, then draw glyphs per column and advance drops. */
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

  /** Fades rain in and ramps draw speed (220ms → 48ms), then runs at fixed interval. */
  function startRain() {
    if (rainTimer) return;
    rain.style.opacity = '0';
    const t0         = Date.now();
    const opDur      = 4000;
    const speedDur   = 5000;
    const speedStart = 220;
    const speedEnd   = 48;

    /** Single step: opacity fade, variable delay until steady `setInterval`. */
    function loop() {
      const elapsed = Date.now() - t0;

      const op = Math.min(elapsed / opDur, 1);
      rain.style.opacity = (op * 0.2).toFixed(4);

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
  const TOTAL  = worlds.length;
  let current = 0;
  let transitioning = false;

  const scrollLayoutMq = window.matchMedia('(max-width: 768px)');

  /** Clears inline styles left by `animateZoom` so CSS can control `.world` again. */
  function clearWorldInline(el) {
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.pointerEvents = '';
  }

  /** Which stacked section is near the viewport center (scroll layout only). */
  function indexFromScrollPosition() {
    const probe = window.scrollY + window.innerHeight * 0.35;
    let acc = 0;
    for (let i = 0; i < worlds.length; i++) {
      const h = worlds[i].offsetHeight;
      if (probe < acc + h) return i;
      acc += h;
    }
    return worlds.length - 1;
  }

  let aboutScrollIo = null;

  function setupAboutScrollObserver() {
    const w1 = document.getElementById('w1');
    if (!w1 || aboutScrollIo) return;
    aboutScrollIo = new IntersectionObserver(
      function (entries) {
        const en = entries[0];
        if (!en) return;
        if (en.isIntersecting && en.intersectionRatio >= 0.28) {
          startAboutStats();
        } else if (!en.isIntersecting || en.intersectionRatio < 0.12) {
          resetAboutStats();
        }
      },
      { threshold: [0, 0.12, 0.28, 0.5] }
    );
    aboutScrollIo.observe(w1);
  }

  function teardownAboutScrollObserver() {
    if (aboutScrollIo) {
      aboutScrollIo.disconnect();
      aboutScrollIo = null;
    }
  }

  /** Toggles `html.layout-scroll`, resets worlds, syncs About stats observer. */
  function applyScrollLayout() {
    if (scrollLayoutMq.matches) {
      document.documentElement.classList.add('layout-scroll');
      Array.prototype.forEach.call(worlds, clearWorldInline);
      setupAboutScrollObserver();
      requestAnimationFrame(function () {
        let target = current;
        const hm = location.hash.match(/^#w(\d)$/);
        if (hm) {
          const hi = parseInt(hm[1], 10);
          if (hi >= 0 && hi < worlds.length) target = hi;
        }
        let acc = 0;
        for (let j = 0; j < target; j++) acc += worlds[j].offsetHeight;
        window.scrollTo(0, acc);
        if (hm && target === parseInt(hm[1], 10)) {
          current = target;
          updateUI(current);
        }
      });
    } else {
      const idx = indexFromScrollPosition();
      window.scrollTo(0, 0);
      document.documentElement.classList.remove('layout-scroll');
      teardownAboutScrollObserver();
      Array.prototype.forEach.call(worlds, clearWorldInline);
      Array.prototype.forEach.call(worlds, function (w, i) {
        w.classList.toggle('active', i === idx);
      });
      current = idx;
      transitioning = false;
      updateUI(current);
      if (current === 1) startAboutStats();
      else resetAboutStats();
    }
  }

  if (typeof scrollLayoutMq.addEventListener === 'function') {
    scrollLayoutMq.addEventListener('change', applyScrollLayout);
  } else {
    scrollLayoutMq.addListener(applyScrollLayout);
  }

  /** Syncs progress dots, section label, and scroll hint visibility to `idx`. */
  function updateUI(idx) {
    pdots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    coordsEl.textContent  = '0' + idx + ' · ' + sectionNames[idx];
    hintEl.style.opacity  = idx === TOTAL - 1 ? '0' : '0.8';
  }

  let aboutStatsRaf = null;

  /** Stops the counter animation and resets stat text to zero. */
  function resetAboutStats() {
    if (aboutStatsRaf) {
      cancelAnimationFrame(aboutStatsRaf);
      aboutStatsRaf = null;
    }
    document.querySelectorAll('#w1 .stat-n[data-count]').forEach(function (el) {
      const suf = el.getAttribute('data-suffix') || '';
      el.textContent = '0' + suf;
    });
  }

  /** Animates `#w1` stat numbers from 0 to `data-count` with ease-out cubic. */
  function startAboutStats() {
    const nodes = document.querySelectorAll('#w1 .stat-n[data-count]');
    if (!nodes.length) return;
    if (aboutStatsRaf) {
      cancelAnimationFrame(aboutStatsRaf);
      aboutStatsRaf = null;
    }
    const items = Array.from(nodes).map(function (el) {
      return {
        el: el,
        end: parseInt(el.getAttribute('data-count'), 10),
        suffix: el.getAttribute('data-suffix') || '',
      };
    });
    const duration = 1800;
    const t0 = performance.now();

    /** t in [0,1] → eased progress (decelerates near the end). */
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    /** One animation frame: interpolate counts, reschedule until complete. */
    function tick(now) {
      const raw = Math.min(1, (now - t0) / duration);
      const e = easeOutCubic(raw);
      items.forEach(function (item) {
        const n = Math.round(e * item.end);
        item.el.textContent = String(n) + item.suffix;
      });
      if (raw < 1) {
        aboutStatsRaf = requestAnimationFrame(tick);
      } else {
        aboutStatsRaf = null;
        items.forEach(function (item) {
          item.el.textContent = String(item.end) + item.suffix;
        });
      }
    }

    items.forEach(function (item) {
      item.el.textContent = '0' + item.suffix;
    });
    aboutStatsRaf = requestAnimationFrame(tick);
  }

  /** Cross-fades worlds with a zoom in/out; runs about-stats when landing on About. */
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
      if (current === 1) {
        startAboutStats();
      } else {
        resetAboutStats();
      }
    }, 950);
  }

  /** Navigates to section index if allowed; closes mobile menu first. */
  function goTo(idx) {
    if (idx === current || transitioning) return;
    closeMenu();
    animateZoom(current, idx);
  }

  let menuOpen = false;

  /** Opens or closes the full-screen nav overlay. */
  function toggleMenu() {
    menuOpen = !menuOpen;
    hamburger.classList.toggle('open', menuOpen);
    menu.classList.toggle('open', menuOpen);
  }

  /** Forces the side menu closed (used before section changes). */
  function closeMenu() {
    menuOpen = false;
    hamburger.classList.remove('open');
    menu.classList.remove('open');
  }

  hamburger.addEventListener('click', toggleMenu);
  menu.addEventListener('click', function (e) { if (e.target === menu) closeMenu(); });

  document.querySelectorAll('a[data-section]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (scrollLayoutMq.matches) {
        closeMenu();
        return;
      }
      e.preventDefault();
      const idx = parseInt(link.getAttribute('data-section'), 10);
      if (!Number.isNaN(idx)) goTo(idx);
    });
  });

  progressEl.addEventListener('click', function (e) {
    if (scrollLayoutMq.matches) return;
    const dot = e.target.closest('.pdot');
    if (!dot) return;
    const idx = parseInt(dot.getAttribute('data-section'), 10);
    if (!Number.isNaN(idx)) goTo(idx);
  });

  let wCool = false;
  window.addEventListener('wheel', function (e) {
    if (scrollLayoutMq.matches) return;
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
    if (scrollLayoutMq.matches) return;
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
    if (scrollLayoutMq.matches) return;
    if (transitioning) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ')
      goTo(Math.min(current + 1, TOTAL - 1));
    if (e.key === 'ArrowUp' || e.key === 'PageUp')
      goTo(Math.max(current - 1, 0));
  });

  // ── Loader sequence ──────────────────────────────────────
  /** Types `text` char by char with jitter; calls `onDone` when finished. */
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

  /** Ends loader phase: starts rain, fades in main UI and nav chrome. */
  function showHero() {
    startRain();
    viewport.style.transition = 'opacity 1.2s ease';
    viewport.style.opacity    = '1';
    setTimeout(function () {
      hamburger.style.transition  = 'opacity 0.8s ease';
      hamburger.style.opacity     = '1';
      if (langSwitch) {
        langSwitch.style.transition = 'opacity 0.8s ease';
        langSwitch.style.opacity    = '1';
      }
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
  applyScrollLayout();

  // Hide all chrome while the loader runs — set AFTER updateUI so we win
  viewport.style.opacity    = '0';
  hamburger.style.opacity   = '0';
  if (langSwitch) langSwitch.style.opacity = '0';
  progressEl.style.opacity  = '0';
  coordsEl.style.opacity    = '0';
  hintEl.style.opacity      = '0';

  // ── Contact Form (Formspree) ─────────────────────────
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    const submitBtn = contactForm.querySelector('.cf-submit');
    const feedback  = contactForm.querySelector('.cf-feedback');
    const isEs      = pageLang === 'es';

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }
      submitBtn.disabled    = true;
      submitBtn.textContent = isEs ? 'Enviando...' : 'Sending...';
      feedback.textContent  = '';
      feedback.className    = 'cf-feedback';

      fetch('https://formspree.io/f/xeepeddw', {
        method:  'POST',
        headers: { 'Accept': 'application/json' },
        body:    new FormData(contactForm),
      })
        .then(function (res) {
          if (res.ok) {
            feedback.textContent = isEs
              ? '¡Mensaje enviado! Te respondo pronto.'
              : "Message sent! I'll get back to you soon.";
            feedback.classList.add('cf-feedback--ok');
            contactForm.reset();
          } else {
            return res.json().then(function (data) { throw data; });
          }
        })
        .catch(function () {
          feedback.textContent = isEs
            ? 'Algo salió mal. Intentá de nuevo o escribime directo.'
            : 'Something went wrong. Try again or reach out directly.';
          feedback.classList.add('cf-feedback--err');
        })
        .finally(function () {
          submitBtn.disabled    = false;
          submitBtn.textContent = isEs ? 'Enviar →' : 'Send →';
        });
    });
  }

  // ── Loader sequence ──────────────────────────────────────
  const loaderPair = LOADER_LINES[pageLang];
  typeLine(loaderPair[0], 52, function () {
    setTimeout(function () {
      loaderText.textContent = '';
      setTimeout(function () {
        typeLine(loaderPair[1], 75, function () {
          setTimeout(function () {
            loaderEl.classList.add('hide');
            setTimeout(showHero, 950);
          }, 1300);
        });
      }, 380);
    }, 1000);
  });

})();
