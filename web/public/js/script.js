// 老浏览器没有 IntersectionObserver 时退回全可见（去掉 js 门控），避免 reveal 元素永久隐藏
if (!('IntersectionObserver' in window)) {
  document.documentElement.classList.remove('js');
} else {
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    // threshold 必须为 0：比例阈值对高于视口数倍的长文（.post-shell）永远达不到，会导致整页隐形
    threshold: 0,
    rootMargin: '0px 0px -8% 0px'
  });

  revealElements.forEach((el) => revealObserver.observe(el));

  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

  if (sections.length && navLinks.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => link.classList.remove('is-active'));
          const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
          if (activeLink) activeLink.classList.add('is-active');
        }
      });
    }, {
      threshold: 0.45
    });

    sections.forEach((section) => navObserver.observe(section));
  }
}

const siteHeader = document.querySelector('.site-header');
const navToggle = document.getElementById('nav-toggle');
const siteNav = document.getElementById('site-nav');

function setMenuOpen(isOpen) {
  if (!siteHeader || !navToggle) {
    return;
  }
  siteHeader.classList.toggle('is-menu-open', isOpen);
  document.body.classList.toggle('is-nav-open', isOpen);
  navToggle.setAttribute('aria-expanded', isOpen);
  navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
}

if (navToggle && siteHeader && siteNav) {
  navToggle.addEventListener('click', () => {
    setMenuOpen(!siteHeader.classList.contains('is-menu-open'));
  });
  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      setMenuOpen(false);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setMenuOpen(false);
    }
  });
  // 断点与 CSS 的汉堡菜单媒体查询保持同源，离开移动断点时收起菜单
  const mobileNavQuery = window.matchMedia('(max-width: 640px)');
  const handleBreakpointChange = (mq) => {
    if (!mq.matches) {
      setMenuOpen(false);
    }
  };
  if (typeof mobileNavQuery.addEventListener === 'function') {
    mobileNavQuery.addEventListener('change', handleBreakpointChange);
  } else if (typeof mobileNavQuery.addListener === 'function') {
    mobileNavQuery.addListener(handleBreakpointChange);
  }
}

function initFlickerText() {
  const targets = document.querySelectorAll('[data-flicker-text]');
  if (!targets.length) {
    return;
  }

  const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('zh-Hans', { granularity: 'grapheme' })
    : null;

  const splitText = (text) => {
    if (segmenter) {
      return Array.from(segmenter.segment(text), (part) => part.segment);
    }
    return Array.from(text);
  };

  const hashText = (text) => Array.from(text).reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) >>> 0;
  }, 2166136261);

  const timingProfile = (target, targetIndex) => {
    if (target.classList.contains('hero-wordmark')) {
      return { base: 40, spread: 260, earlyRatio: 0.42, durationMin: 460, durationMax: 760 };
    }
    if (target.classList.contains('hero-manifesto')) {
      return { base: 145, spread: 820, earlyRatio: 0.18, durationMin: 680, durationMax: 1180 };
    }
    if (target.classList.contains('hero-sub')) {
      return { base: 430, spread: 520, earlyRatio: 0.16, durationMin: 600, durationMax: 980 };
    }
    if (target.classList.contains('hero-location') || target.classList.contains('hero-scroll')) {
      return { base: 500, spread: 560, earlyRatio: 0.2, durationMin: 620, durationMax: 1020 };
    }
    return { base: 90 + targetIndex * 18, spread: 360, earlyRatio: 0.28, durationMin: 520, durationMax: 880 };
  };

  targets.forEach((target, targetIndex) => {
    if (target.dataset.flickerReady === 'true') {
      return;
    }

    const label = target.textContent.replace(/\s+/g, ' ').trim();
    if (label) {
      target.setAttribute('aria-label', label);
    }
    const seed = hashText(`${label}:${targetIndex}`);
    const random = createSeededRandom(seed);
    const profile = timingProfile(target, targetIndex);

    let charIndex = 0;
    const fragment = document.createDocumentFragment();

    target.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
        fragment.appendChild(document.createElement('br'));
        return;
      }

      if (node.nodeType !== Node.TEXT_NODE) {
        fragment.appendChild(node.cloneNode(true));
        return;
      }

      splitText(node.textContent).forEach((char) => {
        const span = document.createElement('span');
        span.className = 'flicker-char';
        span.setAttribute('aria-hidden', 'true');
        const isLitFirst = random() < profile.earlyRatio;
        const delay = isLitFirst
          ? profile.base + random() * 95
          : profile.base + Math.pow(random(), 1.62) * profile.spread;
        const duration = profile.durationMin + random() * (profile.durationMax - profile.durationMin);
        if (isLitFirst && char.trim()) {
          span.classList.add('is-lit-first');
        }
        span.style.setProperty('--flicker-delay', `${Math.round(delay)}ms`);
        span.style.setProperty('--flicker-duration', `${Math.round(duration)}ms`);
        span.textContent = char === ' ' ? '\u00a0' : char;
        fragment.appendChild(span);
        charIndex += 1;
      });
    });

    target.replaceChildren(fragment);
    target.dataset.flickerReady = 'true';
  });
}

initFlickerText();

const particleCanvas = document.querySelector('[data-particle-field]');

function createSeededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/*
 * 石墨发丝背景（graphite strands）
 * 原理：每帧沿几条缓慢变形的骨架曲线画少量 1px 连续细线，
 * 画布用 destination-out 低速渐隐做累积——旧线退成淡淡的铅灰晕影，
 * 新线保持锐利，整体呈现铅笔素描式的丝带束。
 * 细线的横向偏移取近似钟形分布：束心密、边缘散，避免等距条带感。
 */
function initParticleField(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    return;
  }

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const INK = '72, 72, 72';
  const FADE_PER_FRAME = 0.052;
  const STRANDS_PER_FRAME = 4;
  const PREFILL_ROUNDS = 80;

  let width = 0;
  let height = 0;
  let minDim = 0;
  let dpr = 1;
  let frameId = 0;
  let tau = 0;
  let lastNow = 0;
  const rng = createSeededRandom(20260709);
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

  /*
   * 骨架曲线族：u ∈ [0,1] 是沿线参数，t 是慢速时间。
   * closed 的曲线所有角频率取整数倍 TAU·u，保证 u=0 与 u=1 首尾闭合。
   * spread 是丝束半宽（相对视口短边的比例）。
   */
  const lanes = [
    {
      // 中右侧主环：折叠的大环，是画面的视觉主体
      closed: true,
      weight: 0.34,
      spread: 0.072,
      alpha: 0.095,
      segments: 340,
      point(u, t) {
        const a = TAU * u;
        return {
          x: width * (0.64 + 0.02 * Math.sin(t * 0.021))
            + minDim * (0.3 * Math.sin(a + t * 0.013) + 0.115 * Math.sin(2 * a + 1.7 + t * 0.023) + 0.04 * Math.sin(3 * a + 0.6)),
          y: height * (0.42 + 0.02 * Math.cos(t * 0.017))
            + minDim * (0.235 * Math.sin(a + 1.35 + t * 0.011) + 0.085 * Math.sin(3 * a + 0.4 + t * 0.019) + 0.03 * Math.sin(2 * a + 2.2))
        };
      }
    },
    {
      // 左下大环：一半在屏外，只露出上缘的弧
      closed: true,
      weight: 0.22,
      spread: 0.07,
      alpha: 0.078,
      segments: 320,
      point(u, t) {
        const a = TAU * u;
        return {
          x: width * 0.16
            + minDim * (0.38 * Math.sin(a + 0.8 + t * 0.009) + 0.09 * Math.sin(2 * a + t * 0.016)),
          y: height * 1.04
            + minDim * (0.24 * Math.sin(a + 2.4 + t * 0.012) + 0.06 * Math.sin(3 * a + 1.1))
        };
      }
    },
    {
      // 斜穿全屏的开放大弧：左下 → 右上
      closed: false,
      weight: 0.22,
      spread: 0.052,
      alpha: 0.08,
      segments: 300,
      point(u, t) {
        return {
          x: width * (-0.18 + 1.36 * u + 0.05 * Math.sin(TAU * 1.2 * u + t * 0.024)),
          y: height * (0.96 - 0.88 * u)
            + minDim * (0.13 * Math.sin(TAU * 0.9 * u + 2.1 + t * 0.017) + 0.045 * Math.sin(TAU * 2.3 * u + t * 0.01))
        };
      }
    },
    {
      // 右缘垂落的帘线
      closed: false,
      weight: 0.12,
      spread: 0.04,
      alpha: 0.066,
      segments: 260,
      point(u, t) {
        return {
          x: width * 0.94
            + minDim * (0.1 * Math.sin(TAU * 0.9 * u + 0.4 + t * 0.02) - 0.05 * Math.sin(Math.PI * u)),
          y: height * (-0.12 + 1.28 * u)
            + minDim * 0.05 * Math.sin(TAU * 1.6 * u + t * 0.014)
        };
      }
    },
    {
      // 左上轻掠的弧，给页眉留一点笔触
      closed: false,
      weight: 0.1,
      spread: 0.038,
      alpha: 0.058,
      segments: 240,
      point(u, t) {
        return {
          x: width * (-0.1 + 0.85 * u),
          y: height * (0.08 + 0.3 * u)
            + minDim * (0.1 * Math.sin(TAU * 0.8 * u + 1.2 + t * 0.015) + 0.03 * Math.sin(TAU * 2.1 * u + t * 0.01))
        };
      }
    }
  ];

  function pickLane() {
    let roll = rng();
    for (const lane of lanes) {
      roll -= lane.weight;
      if (roll <= 0) {
        return lane;
      }
    }
    return lanes[0];
  }

  function drawStrand(t) {
    const lane = pickLane();
    const spreadPx = lane.spread * minDim;
    // 六成钟形（束心密）+ 四成均匀（摊开成扇），偶发离群线制造飞白
    const bell = (rng() + rng() + rng()) / 1.5 - 1;
    const mix = rng() < 0.6 ? bell : rng() * 2 - 1;
    const off0 = mix * spreadPx * (rng() < 0.07 ? 2.2 : 1);
    // 低频摆动让同束细线互相交叉，织出铅笔排线的效果
    const waveK = lane.closed ? 1 + Math.floor(rng() * 3) : 0.6 + rng() * 2.2;
    const waveAmp = spreadPx * (0.12 + rng() * 0.5) * (rng() < 0.18 ? 2 : 1);
    const wavePhi = rng() * TAU;
    // 高频微颤模拟石墨颗粒（闭合线取整数频率保证接缝平滑）
    const tremorK = lane.closed ? 16 + Math.floor(rng() * 9) : 15 + rng() * 10;
    const tremorPhi = rng() * TAU;
    const alpha = lane.alpha * (0.6 + rng() * 0.85);
    const eps = 0.75 / lane.segments;

    ctx.beginPath();
    for (let i = 0; i <= lane.segments; i += 1) {
      const u = i / lane.segments;
      const p = lane.point(u, t);
      const q = lane.point(u + eps, t);
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const off = off0
        + waveAmp * Math.sin(TAU * waveK * u + wavePhi)
        + 0.35 * Math.sin(TAU * tremorK * u + tremorPhi);
      const x = p.x + (-dy / len) * off;
      const y = p.y + (dx / len) * off;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = `rgba(${INK}, ${alpha})`;
    ctx.lineWidth = 0.55;
    ctx.stroke();
  }

  function fade(strength) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0, 0, 0, ${strength})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  }

  // 预铺历史：模拟若干帧「渐隐 + 落笔」，首屏即是稳态密度，不从空白长出来
  function prefill() {
    ctx.clearRect(0, 0, width, height);
    for (let round = 0; round < PREFILL_ROUNDS; round += 1) {
      fade(FADE_PER_FRAME);
      for (let k = 0; k < STRANDS_PER_FRAME; k += 1) {
        drawStrand(tau - (PREFILL_ROUNDS - round) * 0.016);
      }
    }
  }

  function frame(now) {
    const seconds = now * 0.001;
    const dt = Math.min(0.1, lastNow ? seconds - lastNow : 0.016);
    lastNow = seconds;
    tau += dt;

    // 渐隐强度与落笔数量都按 dt 折算，帧率波动不改变稳态密度
    fade(1 - Math.pow(1 - FADE_PER_FRAME, dt * 60));
    const strandCount = Math.max(1, Math.round(STRANDS_PER_FRAME * dt * 60));
    for (let k = 0; k < strandCount; k += 1) {
      drawStrand(tau);
    }

    // 指针视差：整块画布微移（画布经 CSS 放大 3%，位移不会露出边缘）
    pointer.x += (pointer.targetX - pointer.x) * 0.04;
    pointer.y += (pointer.targetY - pointer.y) * 0.04;
    canvas.style.transform = `scale(1.03) translate3d(${pointer.x * -7}px, ${pointer.y * -5}px, 0)`;

    frameId = window.requestAnimationFrame(frame);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) {
      return;
    }
    width = nextWidth;
    height = nextHeight;
    minDim = Math.min(width, height);
    dpr = nextDpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    prefill();
  }

  function start() {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
    lastNow = 0;
    canvas.style.transform = 'scale(1.03)';
    if (!reduceMotionQuery.matches) {
      frameId = window.requestAnimationFrame(frame);
    }
  }

  const pointerTarget = document.body.classList.contains('home-particle-page')
    ? document
    : canvas.closest('.hero') || canvas;

  pointerTarget.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });

  pointerTarget.addEventListener('pointerleave', () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  });

  // resize 合并到 rAF，一次布局变化只重建一次
  let resizeQueued = false;
  function queueResize() {
    if (resizeQueued) {
      return;
    }
    resizeQueued = true;
    window.requestAnimationFrame(() => {
      resizeQueued = false;
      resize();
    });
  }

  if (typeof ResizeObserver === 'function') {
    const resizeObserver = new ResizeObserver(queueResize);
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener('resize', queueResize);
  }

  if (typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', start);
  } else if (typeof reduceMotionQuery.addListener === 'function') {
    reduceMotionQuery.addListener(start);
  }

  resize();
  start();
}

if (particleCanvas) {
  initParticleField(particleCanvas);
}
