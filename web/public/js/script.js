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
 * 3D Peter de Jong 混沌吸引子点云。
 * 所有点只在初始化时顺序迭代生成一次，GPU 每帧只旋转并投影整片点云。
 * 高密度区域会自然显出丝带，低密度区域保持散点，不绘制线段或拖尾。
 */
function initParticleField(canvas) {
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const HALF_FOV = Math.PI / 8;
  const POINT_COUNT_DESKTOP = 360000;
  const POINT_COUNT_MOBILE = 180000;
  const POINT_SCALE = 900;
  const X_OFFSET = -400;
  const ROTATION_SPEED = Math.PI / 60;
  const ATTRACTOR = {
    a: -1.3388143922812512,
    b: -2.564831973745868,
    c: -2.527437970803663,
    d: 1.8141623559217095,
    e: 3.542189950007197,
    f: 0.31078571067456906
  };

  function createAttractorPositions(count) {
    const positions = new Float32Array(count * 3);
    let x = 0;
    let y = 0;
    let z = 0;

    for (let index = 0; index < count; index += 1) {
      const nextX = Math.sin(ATTRACTOR.a * y) - Math.cos(ATTRACTOR.b * x);
      const nextY = Math.sin(ATTRACTOR.c * x) - Math.cos(ATTRACTOR.d * y);
      const nextZ = Math.sin(ATTRACTOR.e * x) - Math.cos(ATTRACTOR.f * z);
      const offset = index * 3;

      positions[offset] = nextX * POINT_SCALE + X_OFFSET;
      positions[offset + 1] = nextY * POINT_SCALE;
      positions[offset + 2] = nextZ * POINT_SCALE;
      x = nextX;
      y = nextY;
      z = nextZ;
    }

    return positions;
  }

  function initCanvasFallback() {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      return;
    }

    const fallbackCount = window.innerWidth < 720 ? 80000 : 140000;
    const positions = createAttractorPositions(fallbackCount);

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

      for (let index = 0; index < fallbackCount; index += 1) {
        const offset = index * 3;
        const depth = cameraZ - positions[offset + 2];
        if (depth <= 0.1) {
          continue;
        }

        const perspective = cameraZ / depth;
        const screenX = width * 0.5 + positions[offset] * perspective;
        const screenY = height * 0.5 - positions[offset + 1] * perspective;
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
    'attribute vec3 a_position;',
    'uniform vec2 u_viewport;',
    'uniform vec2 u_rotation;',
    '',
    'void main() {',
    '  vec3 point = a_position;',
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
    '  float grey = 218.0 / 255.0;',
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

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const viewportLocation = gl.getUniformLocation(program, 'u_viewport');
  const rotationLocation = gl.getUniformLocation(program, 'u_rotation');
  const positionBuffer = gl.createBuffer();
  if (positionLocation < 0 || !viewportLocation || !rotationLocation || !positionBuffer) {
    return;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let pointCount = 0;
  let frameId = 0;
  let lastNow = 0;
  let rotationX = 0;
  let rotationY = 0;

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1);

  function uploadPointCloud() {
    const nextCount = width < 720 ? POINT_COUNT_MOBILE : POINT_COUNT_DESKTOP;
    if (nextCount === pointCount) {
      return;
    }

    pointCount = nextCount;
    const positions = createAttractorPositions(pointCount);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  }

  function render() {
    if (!width || !height || !pointCount) {
      return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.uniform2f(viewportLocation, width, height);
    gl.uniform2f(rotationLocation, rotationX, rotationY);
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
    const seconds = now * 0.001;
    const dt = Math.min(0.05, lastNow ? seconds - lastNow : 0.016);
    lastNow = seconds;
    rotationX += dt * ROTATION_SPEED;
    rotationY += dt * ROTATION_SPEED;

    render();
    frameId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    lastNow = 0;
    canvas.style.transform = 'none';
    if (reduceMotionQuery.matches) {
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
