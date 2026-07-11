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

const viewportFlickerTargets = document.querySelectorAll('[data-flicker-on-view]');

if (viewportFlickerTargets.length) {
  const reduceFlickerMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceFlickerMotion) {
    viewportFlickerTargets.forEach((target) => target.classList.remove('is-flicker-paused'));
  } else if ('IntersectionObserver' in window) {
    const viewportFlickerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('is-flicker-paused');
          viewportFlickerObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.25,
      rootMargin: '0px 0px -8% 0px'
    });

    viewportFlickerTargets.forEach((target) => viewportFlickerObserver.observe(target));
  } else {
    viewportFlickerTargets.forEach((target) => target.classList.remove('is-flicker-paused'));
  }
}

function initProjectAccordion(root) {
  const items = Array.from(root.querySelectorAll('[data-project-item]'));
  const triggers = Array.from(root.querySelectorAll('[data-project-trigger]'));
  const panels = Array.from(root.querySelectorAll('[data-project-panel]'));
  const panelInners = Array.from(root.querySelectorAll('[data-project-panel-inner]'));
  const mediaWindow = root.querySelector('[data-project-media-window]');
  const mediaTrack = root.querySelector('[data-project-media-track]');
  const mediaItems = Array.from(root.querySelectorAll('[data-project-media-item]'));

  if (!items.length || items.length !== triggers.length || items.length !== panels.length) {
    return;
  }

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = Math.max(0, triggers.findIndex((trigger) => trigger.getAttribute('aria-expanded') === 'true'));

  function positionMedia() {
    if (!mediaTrack || !mediaItems.length) {
      return;
    }

    const itemHeight = mediaItems[0].getBoundingClientRect().height;
    const trackStyle = window.getComputedStyle(mediaTrack);
    const gap = Number.parseFloat(trackStyle.rowGap || trackStyle.gap) || 0;
    const offset = activeIndex * (itemHeight + gap) * -1;
    mediaTrack.style.transform = `translate3d(0, ${offset}px, 0)`;
  }

  function syncMediaPlayback() {
    mediaItems.forEach((mediaItem, index) => {
      const isActive = index === activeIndex;
      mediaItem.setAttribute('aria-hidden', String(!isActive));
      mediaItem.querySelectorAll('video').forEach((video) => {
        if (isActive && !reduceMotionQuery.matches) {
          const playResult = video.play();
          if (playResult && typeof playResult.catch === 'function') {
            playResult.catch(() => {});
          }
        } else {
          video.pause();
        }
      });
    });
  }

  function setActiveProject(nextIndex) {
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    activeIndex = nextIndex;
    root.dataset.activeProject = String(activeIndex);

    items.forEach((item, index) => {
      const isActive = index === activeIndex;
      item.classList.toggle('is-active', isActive);
      triggers[index].setAttribute('aria-expanded', String(isActive));
      panels[index].setAttribute('aria-hidden', String(!isActive));
      if (panelInners[index]) {
        panelInners[index].toggleAttribute('inert', !isActive);
      }
    });

    positionMedia();
    syncMediaPlayback();
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const nextIndex = Number.parseInt(trigger.dataset.projectIndex, 10);
      if (Number.isInteger(nextIndex) && nextIndex !== activeIndex) {
        setActiveProject(nextIndex);
      }
    });
  });

  if (typeof ResizeObserver === 'function' && mediaWindow) {
    const mediaResizeObserver = new ResizeObserver(positionMedia);
    mediaResizeObserver.observe(mediaWindow);
  }

  if (typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', syncMediaPlayback);
  } else if (typeof reduceMotionQuery.addListener === 'function') {
    reduceMotionQuery.addListener(syncMediaPlayback);
  }

  setActiveProject(activeIndex);
}

document.querySelectorAll('[data-project-accordion]').forEach((root) => {
  initProjectAccordion(root);
});

const particleCanvas = document.querySelector('[data-particle-field]');

function createSeededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/*
 * 3D Peter de Jong 混沌吸引子点云。
 * 两组点只在初始化时顺序迭代生成一次，GPU 在滚动跨过 About 后完成形态插值。
 * 参数、点色、视场角、旋转节奏与 nirnor.jp 的公开实现保持一致，仅点数提高为 72 万。
 */
function initParticleField(canvas) {
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const HALF_FOV = Math.PI / 8;
  const POINT_COUNT = 720000;
  const POINT_SCALE = 900;
  const UPDATE_RATE = 90;
  const UPDATE_INTERVAL = 1000 / UPDATE_RATE;
  const ROTATION_STEP = Math.PI / 180 / 30;
  const MORPH_STEP = 1 / UPDATE_RATE;
  const MORPH_TRIGGER = document.querySelector('[data-particle-morph-trigger]');
  const ATTRACTORS = [
    {
      xOffset: -400,
      a: -1.3388143922812512,
      b: -2.564831973745868,
      c: -2.527437970803663,
      d: 1.8141623559217095,
      e: 3.542189950007197,
      f: 0.31078571067456906
    },
    {
      xOffset: 400,
      a: -0.9177339853982867,
      b: 1.5409458316723406,
      c: 2.279682707438794,
      d: 1.3641950476985585,
      e: 1.9459875364821286,
      f: -0.20186017310569326
    }
  ];

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createAttractorPositions(count, attractor) {
    const rawPositions = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      const previousOffset = Math.max(0, offset - 3);
      const x = index > 0 ? rawPositions[previousOffset] : 0;
      const y = index > 0 ? rawPositions[previousOffset + 1] : 0;
      const z = index > 0 ? rawPositions[previousOffset + 2] : 0;

      rawPositions[offset] = Math.sin(attractor.a * y) - Math.cos(attractor.b * x);
      rawPositions[offset + 1] = Math.sin(attractor.c * x) - Math.cos(attractor.d * y);
      rawPositions[offset + 2] = Math.sin(attractor.e * x) - Math.cos(attractor.f * z);
      positions[offset] = rawPositions[offset] * POINT_SCALE + attractor.xOffset;
      positions[offset + 1] = rawPositions[offset + 1] * POINT_SCALE;
      positions[offset + 2] = rawPositions[offset + 2] * POINT_SCALE;
    }

    return positions;
  }

  function initCanvasFallback() {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      return;
    }

    const startPositions = createAttractorPositions(POINT_COUNT, ATTRACTORS[0]);
    const endPositions = createAttractorPositions(POINT_COUNT, ATTRACTORS[1]);

    function drawFallback() {
      const width = Math.max(1, Math.round(canvas.clientWidth));
      const height = Math.max(1, Math.round(canvas.clientHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const cameraZ = height * 0.5 / Math.tan(HALF_FOV);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgb(204, 204, 204)';
      const progress = MORPH_TRIGGER?.getBoundingClientRect().top < 0 ? 1 : 0;

      for (let index = 0; index < POINT_COUNT; index += 1) {
        const offset = index * 3;
        const pointX = startPositions[offset] + (endPositions[offset] - startPositions[offset]) * progress;
        const pointY = startPositions[offset + 1] + (endPositions[offset + 1] - startPositions[offset + 1]) * progress;
        const pointZ = startPositions[offset + 2] + (endPositions[offset + 2] - startPositions[offset + 2]) * progress;
        const depth = cameraZ - pointZ;
        if (depth <= 0.1) {
          continue;
        }

        const perspective = cameraZ / depth;
        const screenX = width * 0.5 + pointX * perspective;
        const screenY = height * 0.5 - pointY * perspective;
        if (screenX >= 0 && screenX < width && screenY >= 0 && screenY < height) {
          ctx.fillRect(screenX, screenY, 0.7, 0.7);
        }
      }
    }

    drawFallback();
    if (typeof ResizeObserver === 'function') {
      const resizeObserver = new ResizeObserver(drawFallback);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', drawFallback);
    }
  }

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance'
  });

  if (!gl) {
    initCanvasFallback();
    return;
  }

  const vertexSource = [
    'attribute vec3 a_position_start;',
    'attribute vec3 a_position_end;',
    'uniform vec2 u_viewport;',
    'uniform vec2 u_rotation;',
    'uniform float u_progress;',
    '',
    'void main() {',
    '  vec3 point = mix(a_position_start, a_position_end, u_progress);',
    '  float cosX = cos(u_rotation.x);',
    '  float sinX = sin(u_rotation.x);',
    '  point = vec3(point.x, point.y * cosX - point.z * sinX, point.y * sinX + point.z * cosX);',
    '',
    '  float cosY = cos(u_rotation.y);',
    '  float sinY = sin(u_rotation.y);',
    '  point = vec3(point.x * cosY + point.z * sinY, point.y, -point.x * sinY + point.z * cosY);',
    '',
    '  float focal = 1.0 / tan(0.3926990817);',
    '  float aspect = u_viewport.x / u_viewport.y;',
    '  float cameraZ = u_viewport.y * 0.5 * focal;',
    '  float viewZ = point.z - cameraZ;',
    '  float nearPlane = 0.1;',
    '  float farPlane = 1000000.0;',
    '  float clipZ = ((farPlane + nearPlane) / (nearPlane - farPlane)) * viewZ',
    '    + ((2.0 * farPlane * nearPlane) / (nearPlane - farPlane));',
    '',
    '  gl_Position = vec4(point.x * focal / aspect, point.y * focal, clipZ, -viewZ);',
    '  gl_PointSize = 1.0;',
    '}'
  ].join('\n');

  const fragmentSource = [
    'precision mediump float;',
    '',
    'void main() {',
    '  float grey = 204.0 / 255.0;',
    '  gl_FragColor = vec4(grey, grey, grey, 1.0);',
    '}'
  ].join('\n');

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    if (!shader) {
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('WebGL shader failed to compile:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    return;
  }

  const program = gl.createProgram();
  if (!program) {
    return;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('WebGL program failed to link:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return;
  }

  const positionStartLocation = gl.getAttribLocation(program, 'a_position_start');
  const positionEndLocation = gl.getAttribLocation(program, 'a_position_end');
  const viewportLocation = gl.getUniformLocation(program, 'u_viewport');
  const rotationLocation = gl.getUniformLocation(program, 'u_rotation');
  const progressLocation = gl.getUniformLocation(program, 'u_progress');
  const positionStartBuffer = gl.createBuffer();
  const positionEndBuffer = gl.createBuffer();
  if (
    positionStartLocation < 0
    || positionEndLocation < 0
    || !viewportLocation
    || !rotationLocation
    || !progressLocation
    || !positionStartBuffer
    || !positionEndBuffer
  ) {
    return;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let pointCount = 0;
  let frameId = 0;
  let lastUpdateTime = 0;
  let rotationX = 0;
  let rotationY = 0;
  let morphProgress = 0;

  gl.useProgram(program);
  gl.enableVertexAttribArray(positionStartLocation);
  gl.enableVertexAttribArray(positionEndLocation);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1);

  function uploadPointCloud() {
    if (pointCount === POINT_COUNT) {
      return;
    }

    pointCount = POINT_COUNT;
    const startPositions = createAttractorPositions(pointCount, ATTRACTORS[0]);
    const endPositions = createAttractorPositions(pointCount, ATTRACTORS[1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionStartBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, startPositions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionEndBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, endPositions, gl.STATIC_DRAW);
  }

  function render() {
    if (!width || !height || !pointCount) {
      return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionStartBuffer);
    gl.vertexAttribPointer(positionStartLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionEndBuffer);
    gl.vertexAttribPointer(positionEndLocation, 3, gl.FLOAT, false, 0, 0);
    gl.uniform2f(viewportLocation, width, height);
    gl.uniform2f(rotationLocation, rotationX, rotationY);
    gl.uniform1f(progressLocation, clamp(morphProgress, 0, 1));
    gl.drawArrays(gl.POINTS, 0, pointCount);
  }

  function resize() {
    const nextWidth = Math.max(1, Math.round(canvas.clientWidth));
    const nextHeight = Math.max(1, Math.round(canvas.clientHeight));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) {
      return;
    }

    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    uploadPointCloud();
    render();
  }

  function frame(now) {
    const elapsed = now - lastUpdateTime;
    if (elapsed > UPDATE_INTERVAL) {
      lastUpdateTime = now;
      if (MORPH_TRIGGER?.getBoundingClientRect().top < 0) {
        if (morphProgress < 1) {
          morphProgress += MORPH_STEP;
        }
      } else if (morphProgress > 0) {
        morphProgress -= MORPH_STEP;
      }

      rotationX += ROTATION_STEP;
      rotationY += ROTATION_STEP;
      render();
    }
    frameId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    lastUpdateTime = 0;
    canvas.style.transform = 'none';
    if (reduceMotionQuery.matches) {
      morphProgress = MORPH_TRIGGER?.getBoundingClientRect().top < 0 ? 1 : 0;
      render();
    } else if (!document.hidden) {
      frameId = window.requestAnimationFrame(frame);
    }
  }

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

  document.addEventListener('visibilitychange', start);
  resize();
  start();
}

if (particleCanvas) {
  initParticleField(particleCanvas);
}

const eventHorizonCanvas = document.querySelector('[data-event-horizon-field]');

/*
 * 深色过渡区使用 nirnor.jp 同款 20 x 20 x 20 三维点阵：
 * 8000 个白色方形点绕三个轴同步旋转，并每 500 次更新在 1x / 10x 尺度间切换。
 * 这里用原生 WebGL 复现 Three.js PointsMaterial 的透视尺寸衰减，避免额外运行时依赖。
 */
function initEventHorizonField(canvas) {
  const GRID_SIZE = 20;
  const GRID_SPACING = 1;
  const BASE_SCALE = 15;
  const POINT_SIZE = 3;
  const UPDATE_RATE = 90;
  const UPDATE_INTERVAL = 1000 / UPDATE_RATE;
  const ROTATION_STEP = Math.PI / 180 / 10;
  const HALF_FOV = Math.PI / 8;
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointCount = GRID_SIZE ** 3;
  const positions = new Float32Array(pointCount * 3);
  let cursor = 0;

  for (let zIndex = 0; zIndex < GRID_SIZE; zIndex += 1) {
    for (let yIndex = 0; yIndex < GRID_SIZE; yIndex += 1) {
      for (let xIndex = 0; xIndex < GRID_SIZE; xIndex += 1) {
        positions[cursor] = xIndex * GRID_SPACING - GRID_SIZE * GRID_SPACING / 2;
        positions[cursor + 1] = yIndex * GRID_SPACING - GRID_SIZE * GRID_SPACING / 2;
        positions[cursor + 2] = zIndex * GRID_SPACING - GRID_SIZE * GRID_SPACING / 2;
        cursor += 3;
      }
    }
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let rotationX = 0;
  let rotationY = 0;
  let rotationZ = 0;
  let animationCount = 0;
  let animationScale = 1;
  let frameId = 0;
  let lastUpdateTime = 0;
  let drawScene = () => {};

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance'
  });

  if (gl) {
    const vertexSource = [
      'attribute vec3 a_position;',
      'uniform vec2 u_viewport;',
      'uniform vec3 u_rotation;',
      'uniform float u_object_scale;',
      'uniform float u_pixel_ratio;',
      '',
      'void main() {',
      '  vec3 point = a_position * u_object_scale;',
      '',
      '  float cosZ = cos(u_rotation.z);',
      '  float sinZ = sin(u_rotation.z);',
      '  point = vec3(point.x * cosZ - point.y * sinZ, point.x * sinZ + point.y * cosZ, point.z);',
      '',
      '  float cosY = cos(u_rotation.y);',
      '  float sinY = sin(u_rotation.y);',
      '  point = vec3(point.x * cosY + point.z * sinY, point.y, -point.x * sinY + point.z * cosY);',
      '',
      '  float cosX = cos(u_rotation.x);',
      '  float sinX = sin(u_rotation.x);',
      '  point = vec3(point.x, point.y * cosX - point.z * sinX, point.y * sinX + point.z * cosX);',
      '',
      '  float focal = 1.0 / tan(0.3926990817);',
      '  float aspect = u_viewport.x / u_viewport.y;',
      '  float cameraZ = u_viewport.y * 0.5 * focal;',
      '  float viewZ = point.z - cameraZ;',
      '  float nearPlane = 0.1;',
      '  float farPlane = 1000000.0;',
      '  float clipZ = ((farPlane + nearPlane) / (nearPlane - farPlane)) * viewZ',
      '    + ((2.0 * farPlane * nearPlane) / (nearPlane - farPlane));',
      '',
      '  gl_Position = vec4(point.x * focal / aspect, point.y * focal, clipZ, -viewZ);',
      '  gl_PointSize = viewZ < -nearPlane',
      '    ? max(1.0, 3.0 * u_pixel_ratio * ((u_viewport.y * 0.5) / -viewZ))',
      '    : 0.0;',
      '}'
    ].join('\n');

    const fragmentSource = [
      'precision mediump float;',
      '',
      'void main() {',
      '  gl_FragColor = vec4(1.0);',
      '}'
    ].join('\n');

    function compileShader(type, source) {
      const shader = gl.createShader(type);
      if (!shader) {
        return null;
      }

      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Event horizon shader failed to compile:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = vertexShader && fragmentShader ? gl.createProgram() : null;
    if (!program || !vertexShader || !fragmentShader) {
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Event horizon WebGL program failed to link:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const viewportLocation = gl.getUniformLocation(program, 'u_viewport');
    const rotationLocation = gl.getUniformLocation(program, 'u_rotation');
    const objectScaleLocation = gl.getUniformLocation(program, 'u_object_scale');
    const pixelRatioLocation = gl.getUniformLocation(program, 'u_pixel_ratio');
    const positionBuffer = gl.createBuffer();
    if (
      positionLocation < 0
      || viewportLocation === null
      || rotationLocation === null
      || objectScaleLocation === null
      || pixelRatioLocation === null
      || !positionBuffer
    ) {
      return;
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);

    drawScene = () => {
      if (!width || !height || gl.isContextLost()) {
        return;
      }

      const responsiveScale = Math.min(window.innerWidth / 1440, 1) * BASE_SCALE;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
      gl.uniform2f(viewportLocation, width, height);
      gl.uniform3f(rotationLocation, rotationX, rotationY, rotationZ);
      gl.uniform1f(objectScaleLocation, responsiveScale * animationScale);
      gl.uniform1f(pixelRatioLocation, dpr);
      gl.drawArrays(gl.POINTS, 0, pointCount);
    };
  } else {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      return;
    }

    drawScene = () => {
      if (!width || !height) {
        return;
      }

      const responsiveScale = Math.min(window.innerWidth / 1440, 1) * BASE_SCALE * animationScale;
      const focal = 1 / Math.tan(HALF_FOV);
      const cameraZ = height * 0.5 * focal;
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      const cosZ = Math.cos(rotationZ);
      const sinZ = Math.sin(rotationZ);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      for (let index = 0; index < pointCount; index += 1) {
        const offset = index * 3;
        const baseX = positions[offset] * responsiveScale;
        const baseY = positions[offset + 1] * responsiveScale;
        const baseZ = positions[offset + 2] * responsiveScale;
        const zRotatedX = baseX * cosZ - baseY * sinZ;
        const zRotatedY = baseX * sinZ + baseY * cosZ;
        const yRotatedX = zRotatedX * cosY + baseZ * sinY;
        const yRotatedZ = -zRotatedX * sinY + baseZ * cosY;
        const xRotatedY = zRotatedY * cosX - yRotatedZ * sinX;
        const xRotatedZ = zRotatedY * sinX + yRotatedZ * cosX;
        const depth = cameraZ - xRotatedZ;
        if (depth <= 0.1) {
          continue;
        }

        const perspective = cameraZ / depth;
        const screenX = width * 0.5 + yRotatedX * perspective;
        const screenY = height * 0.5 - xRotatedY * perspective;
        const size = Math.max(0.5, POINT_SIZE * (height * 0.5) / depth);
        if (screenX >= -size && screenX <= width + size && screenY >= -size && screenY <= height + size) {
          ctx.fillRect(screenX - size * 0.5, screenY - size * 0.5, size, size);
        }
      }
    };
  }

  function resize() {
    const nextWidth = Math.max(1, Math.round(canvas.clientWidth));
    const nextHeight = Math.max(1, Math.round(canvas.clientHeight));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) {
      return;
    }

    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (!gl) {
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    drawScene();
  }

  function advanceScene() {
    rotationX = rotationX > Math.PI * 2 ? 0 : rotationX + ROTATION_STEP;
    rotationY = rotationY > Math.PI * 2 ? 0 : rotationY + ROTATION_STEP;
    rotationZ = rotationZ > Math.PI * 2 ? 0 : rotationZ + ROTATION_STEP;
    animationCount = animationCount > 1000 ? 0 : animationCount + 1;
    animationScale = animationCount < 500 ? 1 : 10;
  }

  function frame(now) {
    if (now - lastUpdateTime > UPDATE_INTERVAL) {
      lastUpdateTime = now;
      advanceScene();
      drawScene();
    }
    frameId = window.requestAnimationFrame(frame);
  }

  function syncAnimation() {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    lastUpdateTime = 0;
    if (reduceMotionQuery.matches) {
      rotationX = 0;
      rotationY = 0;
      rotationZ = 0;
      animationCount = 0;
      animationScale = 1;
      drawScene();
    } else if (!document.hidden) {
      frameId = window.requestAnimationFrame(frame);
    }
  }

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
    reduceMotionQuery.addEventListener('change', syncAnimation);
  } else if (typeof reduceMotionQuery.addListener === 'function') {
    reduceMotionQuery.addListener(syncAnimation);
  }

  document.addEventListener('visibilitychange', syncAnimation);
  resize();
  syncAnimation();
}

if (eventHorizonCanvas) {
  initEventHorizonField(eventHorizonCanvas);
}
