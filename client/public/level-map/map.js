/*
  Candy-style level map demo (original implementation).
  - Canvas-rendered scrolling map
  - S-curve / zig-zag layout bottom -> top
  - Glossy candy nodes, stars, and a candy-cane striped path

  Open in dev server at: /level-map/
*/

(() => {
  const mapWrap = document.getElementById('mapWrap');
  const canvas = document.getElementById('map');
  const toast = document.getElementById('toast');
  const ctx = canvas.getContext('2d');

  /** @typedef {{ number: number, stars: 0|1|2|3, unlocked: boolean, completed: boolean }} Level */

  /** @type {Level[]} */
  const Levels = buildLevels(60, 18);

  const Episodes = buildEpisodes(Levels.length);

  const State = {
    dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    width: 0,
    height: 0,
    worldHeight: 0,
    spacing: 120,
    marginTop: 120,
    marginBottom: 140,
    pathAmplitude: 140,
    pathPeriod: 8,
    nodes: /** @type {{level: Level, x: number, y: number, r: number, scale: number}[]} */ ([]),
    stripePattern: null,
    lastTime: performance.now(),
    time: 0,
    hoveredLevel: null,
  };

  const Palette = {
    ink: 'rgba(20, 18, 24, 0.85)',
    shadow: 'rgba(0, 0, 0, 0.18)',
    shadowHard: 'rgba(0, 0, 0, 0.28)',

    // Node base colors
    doneA: '#1fb6ff',
    doneB: '#22c55e',
    currentA: '#ffce3a',
    currentB: '#ff4fb1',
    lockedA: '#cbd5e1',
    lockedB: '#94a3b8',

    // Path
    caneA: '#ff4d79',
    caneB: '#ffffff',

    // Stars
    starA: '#ffe16a',
    starB: '#ffb100',
  };

  function buildLevels(count, currentLevelNumber) {
    /** @type {Level[]} */
    const list = [];

    for (let i = 1; i <= count; i += 1) {
      const completed = i < currentLevelNumber;
      const unlocked = i <= currentLevelNumber;
      /** @type {0|1|2|3} */
      const stars = completed ? /** @type {0|1|2|3} */ (((i * 7) % 4)) : 0;
      list.push({ number: i, stars, unlocked, completed });
    }

    // Ensure completed levels show 1-3 stars (avoid 0).
    for (const lvl of list) {
      if (lvl.completed && lvl.stars === 0) lvl.stars = 1;
    }

    return list;
  }

  function buildEpisodes(levelCount) {
    const chunk = 15;
    /** @type {{name: string, start: number, end: number, theme: string}[]} */
    const eps = [];
    const themes = [
      { name: 'Candy Town', theme: 'candy' },
      { name: 'Chocolate Mountains', theme: 'chocolate' },
      { name: 'Lollipop Orchard', theme: 'lollipop' },
      { name: 'Marshmallow Meadow', theme: 'marshmallow' },
    ];

    let idx = 0;
    for (let start = 1; start <= levelCount; start += chunk) {
      const t = themes[idx % themes.length];
      const end = Math.min(levelCount, start + chunk - 1);
      eps.push({ name: t.name, start, end, theme: t.theme });
      idx += 1;
    }

    return eps;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove('is-visible'), 1400);
  }
  showToast._t = 0;

  function resize() {
    const rect = mapWrap.getBoundingClientRect();
    State.width = Math.max(320, Math.floor(rect.width));
    State.height = Math.max(400, Math.floor(rect.height));

    State.spacing = clamp(Math.floor(State.width * 0.25), 96, 140);
    State.pathAmplitude = clamp(Math.floor(State.width * 0.22), 110, 180);

    State.worldHeight =
      State.marginTop + State.marginBottom + (Levels.length - 1) * State.spacing + 520;

    // Canvas is full world height; container provides scrolling.
    canvas.style.height = `${State.worldHeight}px`;
    canvas.width = Math.floor(State.width * State.dpr);
    canvas.height = Math.floor(State.worldHeight * State.dpr);
    ctx.setTransform(State.dpr, 0, 0, State.dpr, 0, 0);

    State.stripePattern = makeStripePattern();
    layoutNodes();
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function makeStripePattern() {
    const s = 40;
    const off = document.createElement('canvas');
    off.width = s;
    off.height = s;
    const o = off.getContext('2d');

    // diagonal stripes
    o.fillStyle = Palette.caneB;
    o.fillRect(0, 0, s, s);

    o.strokeStyle = Palette.caneA;
    o.lineWidth = 16;
    o.lineCap = 'butt';

    o.beginPath();
    o.moveTo(-s, s * 0.25);
    o.lineTo(s * 1.25, -s);
    o.stroke();

    o.beginPath();
    o.moveTo(-s, s * 1.25);
    o.lineTo(s * 1.25, 0);
    o.stroke();

    return ctx.createPattern(off, 'repeat');
  }

  function layoutNodes() {
    const w = State.width;
    const cx = w * 0.5;

    State.nodes.length = 0;

    for (let i = 0; i < Levels.length; i += 1) {
      const lvl = Levels[i];
      const y = State.worldHeight - State.marginBottom - i * State.spacing;

      // S-curve / zig-zag progression
      const u = i / (Levels.length - 1);
      const amp = State.pathAmplitude * lerp(1.0, 0.65, u); // slight perspective
      const x = cx + Math.sin((i / State.pathPeriod) * Math.PI) * amp;

      // nodes shrink slightly as they go upward (2.5D depth cue)
      const scale = lerp(1.08, 0.9, easeOutCubic(u));
      const r = 26 * scale;

      State.nodes.push({ level: lvl, x, y, r, scale });
    }
  }

  function draw(now) {
    const dt = Math.min(0.05, (now - State.lastTime) / 1000);
    State.lastTime = now;
    State.time += dt;

    const scrollTop = mapWrap.scrollTop;
    const viewTop = scrollTop;
    const viewBottom = scrollTop + State.height;

    ctx.clearRect(0, 0, State.width, State.worldHeight);

    // Only draw region that matters (clip) for performance.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, viewTop - 80, State.width, State.height + 160);
    ctx.clip();

    drawEpisodes(viewTop, viewBottom);
    drawPath(viewTop, viewBottom);
    drawNodes(viewTop, viewBottom);

    ctx.restore();

    requestAnimationFrame(draw);
  }

  function drawEpisodes(viewTop, viewBottom) {
    // Determine each episode vertical region based on its start/end nodes.
    for (const ep of Episodes) {
      const startIdx = ep.start - 1;
      const endIdx = ep.end - 1;
      const startNode = State.nodes[startIdx];
      const endNode = State.nodes[endIdx];
      if (!startNode || !endNode) continue;

      const top = endNode.y - 260;
      const bottom = startNode.y + 260;
      if (bottom < viewTop - 220 || top > viewBottom + 220) continue;

      // base gradient background strip
      const g = ctx.createLinearGradient(0, top, 0, bottom);

      if (ep.theme === 'candy') {
        g.addColorStop(0, 'rgba(255, 235, 245, 0.95)');
        g.addColorStop(1, 'rgba(255, 250, 223, 0.85)');
      } else if (ep.theme === 'chocolate') {
        g.addColorStop(0, 'rgba(255, 244, 231, 0.92)');
        g.addColorStop(1, 'rgba(235, 220, 208, 0.88)');
      } else if (ep.theme === 'lollipop') {
        g.addColorStop(0, 'rgba(240, 253, 255, 0.92)');
        g.addColorStop(1, 'rgba(255, 236, 247, 0.86)');
      } else {
        g.addColorStop(0, 'rgba(245, 255, 244, 0.9)');
        g.addColorStop(1, 'rgba(255, 245, 250, 0.86)');
      }

      ctx.fillStyle = g;
      roundRect(12, top, State.width - 24, bottom - top, 26);
      ctx.fill();

      // Episode title chip
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      const chipW = clamp(State.width * 0.62, 260, 420);
      const chipX = (State.width - chipW) * 0.5;
      const chipY = top + 22;
      roundRect(chipX, chipY, chipW, 42, 999);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = Palette.ink;
      ctx.font = '800 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ep.name, State.width * 0.5, chipY + 21);
      ctx.restore();

      // Simple themed decorations (lightweight but evocative)
      if (ep.theme === 'chocolate') {
        drawChocolateMountains(top + 110, bottom - 70);
      } else if (ep.theme === 'lollipop') {
        drawLollipopTrees(top + 110, bottom - 80);
      } else if (ep.theme === 'marshmallow') {
        drawMarshmallowHills(top + 140, bottom - 80);
      } else {
        drawCandyClouds(top + 120, bottom - 90);
      }
    }
  }

  function drawChocolateMountains(top, bottom) {
    const left = 20;
    const right = State.width - 20;

    ctx.save();
    ctx.globalAlpha = 0.9;

    // Mountain silhouettes
    const peaks = [
      { x: lerp(left, right, 0.18), y: lerp(top, bottom, 0.35), h: 140 },
      { x: lerp(left, right, 0.48), y: lerp(top, bottom, 0.42), h: 180 },
      { x: lerp(left, right, 0.74), y: lerp(top, bottom, 0.38), h: 150 },
    ];

    for (const p of peaks) {
      ctx.beginPath();
      ctx.moveTo(p.x - 160, bottom);
      ctx.lineTo(p.x, p.y);
      ctx.lineTo(p.x + 160, bottom);
      ctx.closePath();

      const g = ctx.createLinearGradient(p.x, p.y, p.x, bottom);
      g.addColorStop(0, 'rgba(120, 66, 47, 0.40)');
      g.addColorStop(1, 'rgba(78, 42, 30, 0.20)');
      ctx.fillStyle = g;
      ctx.fill();
    }

    ctx.restore();
  }

  function drawLollipopTrees(top, bottom) {
    ctx.save();
    ctx.globalAlpha = 0.95;

    const xs = [State.width * 0.18, State.width * 0.52, State.width * 0.82];
    for (let i = 0; i < xs.length; i += 1) {
      const x = xs[i];
      const y = lerp(bottom, top, 0.35 + 0.18 * i);

      // stick
      ctx.strokeStyle = 'rgba(120, 70, 55, 0.22)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y + 120);
      ctx.lineTo(x, y);
      ctx.stroke();

      // candy top
      const r = 44 + i * 6;
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 10, x, y, r);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      g.addColorStop(0.35, i % 2 ? 'rgba(255, 154, 205, 0.90)' : 'rgba(130, 230, 255, 0.90)');
      g.addColorStop(1, 'rgba(255, 92, 168, 0.45)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // swirl
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.65, 0.3, Math.PI * 1.6);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawMarshmallowHills(top, bottom) {
    ctx.save();
    ctx.globalAlpha = 0.9;

    for (let i = 0; i < 4; i += 1) {
      const cx = lerp(0, State.width, 0.2 + i * 0.22);
      const cy = lerp(bottom, top, 0.28 + i * 0.12);
      const rx = 170;
      const ry = 90;

      const g = ctx.createRadialGradient(cx - 40, cy - 30, 30, cx, cy, 220);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,210,230,0.25)');

      ctx.fillStyle = g;
      ellipse(cx, cy, rx, ry);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawCandyClouds(top, bottom) {
    ctx.save();
    ctx.globalAlpha = 0.75;

    for (let i = 0; i < 6; i += 1) {
      const x = lerp(20, State.width - 20, (i + 0.5) / 6);
      const y = lerp(top, bottom, 0.22 + (i % 3) * 0.14);
      const r = 26 + (i % 3) * 6;

      const g = ctx.createRadialGradient(x - 12, y - 12, 10, x, y, r * 2);
      g.addColorStop(0, 'rgba(255,255,255,0.70)');
      g.addColorStop(1, 'rgba(255,255,255,0.00)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + r * 0.9, y + 6, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - r * 0.9, y + 8, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawPath(viewTop, viewBottom) {
    // Build a polyline through nodes.
    const pts = [];
    for (const n of State.nodes) {
      if (n.y < viewTop - 240 || n.y > viewBottom + 240) continue;
      pts.push([n.x, n.y]);
    }

    if (pts.length < 2) return;

    ctx.save();

    // 2.5D feel: a soft extruded shadow beneath the path.
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 1) {
      const [x, y] = pts[i];
      if (i === 0) ctx.moveTo(x + 8, y + 10);
      else ctx.lineTo(x + 8, y + 10);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.lineWidth = 34;
    ctx.stroke();

    // Candy-cane main stroke
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 1) {
      const [x, y] = pts[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 28;
    ctx.strokeStyle = State.stripePattern;
    ctx.stroke();

    // Highlight stroke
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 1) {
      const [x, y] = pts[i];
      if (i === 0) ctx.moveTo(x - 2, y - 2);
      else ctx.lineTo(x - 2, y - 2);
    }
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();

    ctx.restore();
  }

  function drawNodes(viewTop, viewBottom) {
    const current = Levels.find((l) => l.unlocked && !l.completed)?.number ?? Levels[0].number;

    for (const n of State.nodes) {
      if (n.y < viewTop - 220 || n.y > viewBottom + 220) continue;

      const lvl = n.level;
      const isCurrent = lvl.number === current;

      // Node base
      drawCandyNode(n.x, n.y, n.r, lvl, isCurrent, State.time, n.scale);

      // Stars for completed
      if (lvl.completed && lvl.stars > 0) {
        const starBaseY = n.y + n.r + 18;
        const total = lvl.stars;
        const spread = 18;
        for (let i = 0; i < total; i += 1) {
          const x = n.x + (i - (total - 1) / 2) * spread;
          drawStar(x, starBaseY, 8 * n.scale);
        }
      }

      // Level number
      ctx.save();
      ctx.fillStyle = 'rgba(20, 18, 24, 0.88)';
      ctx.font = `${Math.round(14 * n.scale)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(lvl.number), n.x, n.y + 1);
      ctx.restore();
    }
  }

  function drawCandyNode(x, y, r, lvl, isCurrent, time, scale) {
    const unlocked = lvl.unlocked;
    const completed = lvl.completed;

    let a = Palette.lockedA;
    let b = Palette.lockedB;
    if (completed) {
      a = Palette.doneA;
      b = Palette.doneB;
    } else if (unlocked) {
      a = Palette.currentA;
      b = Palette.currentB;
    }

    const pulse = isCurrent ? 1 + 0.07 * (0.5 + 0.5 * Math.sin(time * 3.2)) : 1;
    const R = r * pulse;

    // Shadow ellipse for depth
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ellipse(x + 8, y + 12, R * 0.9, R * 0.55);
    ctx.fill();
    ctx.restore();

    // Outer glow for current
    if (isCurrent) {
      ctx.save();
      const g = ctx.createRadialGradient(x, y, R * 0.4, x, y, R * 1.55);
      g.addColorStop(0, 'rgba(255, 120, 190, 0.00)');
      g.addColorStop(0.55, 'rgba(255, 120, 190, 0.16)');
      g.addColorStop(1, 'rgba(255, 120, 190, 0.00)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, R * 1.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Sphere
    ctx.save();

    const fill = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.2, x, y, R);
    fill.addColorStop(0, 'rgba(255,255,255,0.95)');
    fill.addColorStop(0.28, a);
    fill.addColorStop(1, b);

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    const hi = ctx.createRadialGradient(x - R * 0.35, y - R * 0.42, 2, x - R * 0.35, y - R * 0.42, R * 0.7);
    hi.addColorStop(0, 'rgba(255,255,255,0.80)');
    hi.addColorStop(1, 'rgba(255,255,255,0.00)');
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.arc(x - R * 0.15, y - R * 0.18, R * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // Rim stroke
    ctx.lineWidth = 2;
    ctx.strokeStyle = unlocked ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, R - 1, 0, Math.PI * 2);
    ctx.stroke();

    // Locked overlay
    if (!unlocked) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(x, y, R * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // tiny lock glyph
      ctx.save();
      ctx.strokeStyle = 'rgba(20,18,24,0.55)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y - 6, R * 0.18, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = 'rgba(20,18,24,0.55)';
      roundRect(x - R * 0.16, y - 2, R * 0.32, R * 0.24, 6 * scale);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawStar(cx, cy, r) {
    ctx.save();

    // shadow
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    drawStarPath(cx + 4, cy + 4, r);
    ctx.fill();

    // body
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 2, cx, cy, r * 1.6);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, Palette.starA);
    g.addColorStop(1, Palette.starB);

    ctx.fillStyle = g;
    drawStarPath(cx, cy, r);
    ctx.fill();

    // highlight
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    drawStarPath(cx - r * 0.15, cy - r * 0.2, r * 0.55);
    ctx.fill();

    ctx.restore();
  }

  function drawStarPath(cx, cy, r) {
    const spikes = 5;
    const outer = r;
    const inner = r * 0.48;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i += 1) {
      const ang = (i * Math.PI) / spikes - Math.PI / 2;
      const rr = i % 2 === 0 ? outer : inner;
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function ellipse(cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.closePath();
  }

  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top + mapWrap.scrollTop;

    // Find nearest node in a small radius.
    let best = null;
    let bestD2 = Infinity;

    for (const n of State.nodes) {
      const dx = x - n.x;
      const dy = y - n.y;
      const d2 = dx * dx + dy * dy;
      const rr = (n.r * 1.35) ** 2;
      if (d2 < rr && d2 < bestD2) {
        best = n;
        bestD2 = d2;
      }
    }

    return best;
  }

  function onPointerMove(e) {
    const t = e.touches?.[0] ?? e;
    const hit = hitTest(t.clientX, t.clientY);
    State.hoveredLevel = hit?.level?.number ?? null;
    canvas.style.cursor = hit && hit.level.unlocked ? 'pointer' : 'default';
  }

  function onPointerDown(e) {
    const t = e.touches?.[0] ?? e;
    const hit = hitTest(t.clientX, t.clientY);
    if (!hit) return;

    const { level } = hit;
    if (!level.unlocked) {
      showToast(`Level ${level.number} is locked`);
      return;
    }

    showToast(`Selected Level ${level.number}${level.completed ? ` • ${level.stars}★` : ''}`);
  }

  function init() {
    resize();

    mapWrap.addEventListener('scroll', () => {
      // no-op; animation loop reads scrollTop
    });

    window.addEventListener('resize', resize);

    canvas.addEventListener('mousemove', onPointerMove, { passive: true });
    canvas.addEventListener('touchmove', onPointerMove, { passive: true });

    canvas.addEventListener('mousedown', onPointerDown, { passive: true });
    canvas.addEventListener('touchstart', onPointerDown, { passive: true });

    // Start near the current level (bottom-ish)
    const currentIdx = Levels.findIndex((l) => l.unlocked && !l.completed);
    const targetIdx = currentIdx >= 0 ? currentIdx : 0;
    const targetY = State.nodes[targetIdx]?.y ?? State.worldHeight - 200;
    mapWrap.scrollTop = clamp(targetY - State.height * 0.68, 0, State.worldHeight - State.height);

    requestAnimationFrame(draw);
  }

  init();
})();
