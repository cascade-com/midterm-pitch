(() => {
  const W = 1920;
  const H = 1080;

  const stage = document.getElementById('stage');
  const scenes = [...stage.querySelectorAll(':scope > .scene')];
  const lensEl = document.getElementById('lens');
  const lensContent = document.getElementById('lens-content');
  const ring = document.getElementById('lens-ring');
  const ripple = document.getElementById('ripple');
  const bar = document.getElementById('progress-bar');
  const counter = document.getElementById('counter');
  const video = document.getElementById('demo-video');
  const videoFrame = video.closest('.videoframe');

  const HERO = scenes.findIndex((s) => s.id === 'hero');
  const CHAIN = scenes.findIndex((s) => s.id === 'chain');
  const ASIS = scenes.findIndex((s) => s.id === 'asis');

  // Lens geometry in canvas pixels. R0 is the lens element's own radius;
  // every size change is a transform scale, so nothing is laid out or re-clipped per frame.
  const R0 = 285;
  const START = { x: 323, y: 780 };
  const TARGET = { x: 1451, y: 780 };
  const MAG = 1.7;
  const FALL_X = 1720; // where the stream leaves the opening scene and enters the chain scene

  const lens = { x: 0, y: 0, s: 1, m: MAG, ringOpacity: 1, opacity: 1 };
  let si = 0;
  let st = 0;
  let busy = false;

  // ---------- helpers ----------
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInQuad = (t) => t * t;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function tween(ms, fn, ease = easeInOut) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const frame = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        fn(ease(p));
        if (p < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  function fit() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    const x = (innerWidth - W * s) / 2;
    const y = (innerHeight - H * s) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }

  const stepsOf = (i) => Math.max(1, Number(scenes[i].dataset.steps) || 1);

  function applySteps(scene, n) {
    scene.querySelectorAll('[data-step]').forEach((el) => {
      el.classList.toggle('shown', Number(el.dataset.step) <= n);
    });
  }

  function ui() {
    let total = 0;
    let done = 0;
    scenes.forEach((_, i) => {
      if (i < si) done += stepsOf(i);
      total += stepsOf(i);
    });
    done += st + 1;
    bar.style.width = `${(done / total) * 100}%`;
    counter.textContent = `${si + 1} / ${scenes.length}`;
    history.replaceState(null, '', `#${si + 1}.${st}`);
  }

  // ---------- water drawings ----------
  // The opening picture: the logo's ribbon, stretched over the five records.
  // Each step is a flat run, then the logo's S-curve down to the next level.
  function buildFalls() {
    const steps = 5;
    const x0 = 1040;
    const y0 = 330;
    const dx = 150;
    const dy = 120;
    const run = 58;
    const bend = dx - run;
    let d = `M${x0} ${y0}`;
    for (let i = 0; i < steps; i++) {
      const x = x0 + i * dx + run;
      const y = y0 + i * dy;
      if (i < steps - 1) {
        d += ` H${x} C${x + bend * 0.56} ${y} ${x + bend * 0.5} ${y + dy} ${x + bend} ${y + dy}`;
      } else {
        // The last step tips over and falls straight down at FALL_X, where the next scene's stream comes in.
        d += ` H${x} C${x + 14} ${y} ${FALL_X} ${y + 18} ${FALL_X} ${y + 50} V1130`;
      }
    }
    document.getElementById('falls-water').setAttribute('d', d);
    document.getElementById('falls-shine').setAttribute('d', d);
  }

  function buildWaves() {
    document.querySelectorAll('.wave').forEach((svg) => {
      const amp = Number(svg.dataset.amp);
      const len = Number(svg.dataset.len);
      const base = Number(svg.dataset.base);
      const half = len / 2;
      let d = `M0 ${base} Q${half / 2} ${base - amp} ${half} ${base}`;
      for (let x = len; x <= 3840; x += half) d += ` T${x} ${base}`;
      d += ' V150 H0 Z';
      svg.querySelector('path').setAttribute('d', d);
    });
  }

  // ---------- magnifier ----------
  function drawLens() {
    const { x, y, s, m } = lens;
    const k = m / s;
    const outer = `translate3d(${x - R0 * s}px, ${y - R0 * s}px, 0) scale(${s})`;
    lensEl.style.transform = outer;
    lensEl.style.opacity = lens.opacity;
    lensContent.style.transform = `translate3d(${R0 - k * x}px, ${R0 - k * y}px, 0) scale(${k})`;
    ring.style.transform = outer;
    ring.style.opacity = Math.min(lens.opacity, lens.ringOpacity);
  }

  function buildClone() {
    lensContent.innerHTML = '';
    const c = scenes[CHAIN].cloneNode(true);
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
    c.classList.add('active', 'static');
    c.querySelectorAll('[data-step]').forEach((e) => e.classList.add('shown'));
    lensContent.appendChild(c);
  }

  function showLens() {
    lensEl.style.display = 'block';
    ring.style.display = 'block';
  }

  function hideLens() {
    lensEl.style.display = 'none';
    ring.style.display = 'none';
  }

  async function lensIn() {
    buildClone();
    Object.assign(lens, START, { s: 0.85, m: MAG, ringOpacity: 1, opacity: 0 });
    drawLens();
    showLens();
    await tween(400, (p) => {
      lens.opacity = p;
      lens.s = lerp(0.85, 1, p);
      drawLens();
    }, easeOut);
    await tween(1700, (p) => {
      lens.x = lerp(START.x, TARGET.x, p);
      lens.y = lerp(START.y, TARGET.y, p);
      drawLens();
    });
  }

  // One click: the magnifier appears, glides to the Downstream Agent and dives into the next scene.
  async function zoomInto() {
    busy = true;
    await lensIn();
    await dive();
  }

  async function dive() {
    busy = true;
    const s0 = lens.s;
    const m0 = lens.m;
    const sEnd = 2050 / R0;
    // Let the browser repaint the lens at its growing size instead of stretching a cached bitmap.
    lensEl.style.willChange = 'auto';
    lensContent.style.willChange = 'auto';
    await tween(1100, (p) => {
      lens.s = lerp(s0, sEnd, p);
      lens.m = lerp(m0, 4, p);
      lens.ringOpacity = Math.max(0, 1 - p * 2);
      drawLens();
    }, easeInQuad);

    // Swap scenes underneath the fully magnified lens.
    leaveScene(scenes[si]);
    scenes[si].classList.remove('active');
    si = ASIS;
    st = 0;
    const s = scenes[si];
    s.classList.add('instant', 'active', 'from-zoom');
    applySteps(s, -1);
    void s.offsetWidth;
    applySteps(s, 0);
    ui();

    ripple.classList.remove('go');
    void ripple.offsetWidth;
    ripple.classList.add('go');

    lensEl.style.transition = 'opacity 0.7s ease';
    lensEl.style.opacity = 0;
    await wait(750);
    hideLens();
    lensEl.style.transition = '';
    lensEl.style.willChange = '';
    lensContent.style.willChange = '';
    s.classList.remove('instant');
    setTimeout(() => {
      s.classList.remove('from-zoom');
      ripple.classList.remove('go');
    }, 700);
    busy = false;
  }

  // ---------- opening → chain: the stream falls into the next scene ----------
  async function fallInto() {
    busy = true;
    const hero = scenes[HERO];
    const chain = scenes[CHAIN];
    chain.classList.add('pre-pour', 'no-anim', 'instant', 'active');
    applySteps(chain, 0);
    chain.style.transform = `translate3d(0, ${H}px, 0)`;
    hero.classList.add('instant');
    void chain.offsetWidth;
    await tween(1000, (p) => {
      hero.style.transform = `translate3d(0, ${-H * p}px, 0)`;
      chain.style.transform = `translate3d(0, ${H * (1 - p)}px, 0)`;
    });
    hero.classList.remove('active');
    hero.style.transform = '';
    chain.style.transform = '';
    si = CHAIN;
    st = 0;
    ui();
    void hero.offsetWidth;
    hero.classList.remove('instant');
    chain.classList.remove('no-anim', 'instant', 'pre-pour');
    chain.classList.add('pour');
    busy = false;
  }

  function leaveScene(scene) {
    scene.classList.remove('pour', 'pre-pour');
  }

  // ---------- navigation ----------
  function goScene(target, step) {
    if (si === CHAIN) hideLens();
    if (scenes[si].id === 'demo') video.pause();
    leaveScene(scenes[si]);
    scenes[si].classList.remove('active');
    si = target;
    st = step;
    const s = scenes[si];
    applySteps(s, -1);
    s.classList.add('active');
    void s.offsetWidth;
    applySteps(s, st);
    ui();
  }

  function next() {
    if (busy) return;
    if (st < stepsOf(si) - 1) {
      st++;
      applySteps(scenes[si], st);
      ui();
      return;
    }
    if (si === HERO && CHAIN === HERO + 1) {
      fallInto();
      return;
    }
    if (si === CHAIN && ASIS === CHAIN + 1) {
      zoomInto();
      return;
    }
    if (si < scenes.length - 1) goScene(si + 1, 0);
  }

  function prev() {
    if (busy) return;
    if (st > 0) {
      st--;
      applySteps(scenes[si], st);
      ui();
      return;
    }
    if (si > 0) goScene(si - 1, stepsOf(si - 1) - 1);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  function toggleVideo() {
    if (scenes[si].id !== 'demo' || !videoFrame.classList.contains('has-video')) return;
    if (video.paused) video.play();
    else video.pause();
  }

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) {
      e.preventDefault();
      next();
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) {
      e.preventDefault();
      prev();
    } else if (k === 'f' || k === 'F') {
      toggleFullscreen();
    } else if (k === 'p' || k === 'P') {
      toggleVideo();
    } else if (k === 'Home') {
      if (!busy) goScene(0, 0);
    }
  });

  addEventListener('click', (e) => {
    if (e.target.closest('video, a, button')) return;
    next();
  });

  // Demo recording: shown only if assets/demo.mp4 exists.
  video.addEventListener('loadedmetadata', () => {
    videoFrame.classList.add('has-video');
    video.controls = true;
  });

  // A broken drawing must never stop the presentation from working.
  for (const draw of [buildFalls, buildWaves]) {
    try { draw(); } catch (err) { console.error(err); }
  }
  addEventListener('resize', fit);
  fit();

  // ---------- start ----------
  const hash = location.hash.match(/^#(\d+)(?:\.(\d+))?$/);
  if (hash) {
    const s = Math.min(scenes.length - 1, Math.max(0, Number(hash[1]) - 1));
    const step = Math.min(stepsOf(s) - 1, Number(hash[2] || 0));
    si = s;
    goScene(s, step);
  } else {
    goScene(0, 0);
  }
})();
