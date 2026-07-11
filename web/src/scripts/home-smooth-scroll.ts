import Lenis from "lenis";
import "lenis/dist/lenis.css";

const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const frameInterval = 1000 / 90;

let lenis: Lenis | null = null;
let frameId = 0;
let lastFrameTime = 0;

function frame(time: number) {
  if (!lenis) {
    return;
  }

  if (time - lastFrameTime > frameInterval) {
    lastFrameTime = time;
    lenis.raf(time);
  }

  frameId = window.requestAnimationFrame(frame);
}

function startSmoothScroll() {
  if (lenis || reduceMotionQuery.matches) {
    return;
  }

  lenis = new Lenis({
    autoRaf: false,
    lerp: 0.1,
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.075,
    touchInertiaExponent: 1.7,
    touchMultiplier: 1,
    wheelMultiplier: 1,
    overscroll: true,
  });

  lastFrameTime = window.performance.now();
  frameId = window.requestAnimationFrame(frame);
}

function stopSmoothScroll() {
  if (frameId) {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }

  lenis?.destroy();
  lenis = null;
}

function syncMotionPreference() {
  if (reduceMotionQuery.matches) {
    stopSmoothScroll();
  } else {
    startSmoothScroll();
  }
}

function handleAnchorClick(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !lenis
  ) {
    return;
  }

  const source = event.target;
  if (!(source instanceof Element)) {
    return;
  }

  const anchor = source.closest<HTMLAnchorElement>('a[href^="#"]');
  const hash = anchor?.getAttribute("href");
  if (!anchor || !hash || hash === "#" || anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return;
  }

  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!target) {
    return;
  }

  event.preventDefault();

  if (window.location.hash === hash) {
    window.history.replaceState(null, "", hash);
  } else {
    window.history.pushState(null, "", hash);
  }

  lenis.scrollTo(target, {
    duration: 1.5,
  });
}

function removeListeners() {
  document.removeEventListener("click", handleAnchorClick);
  window.removeEventListener("pagehide", handlePageHide);
  window.removeEventListener("pageshow", handlePageShow);

  if (typeof reduceMotionQuery.removeEventListener === "function") {
    reduceMotionQuery.removeEventListener("change", syncMotionPreference);
  } else {
    reduceMotionQuery.removeListener(syncMotionPreference);
  }
}

function handlePageHide(event: PageTransitionEvent) {
  stopSmoothScroll();

  if (!event.persisted) {
    removeListeners();
  }
}

function handlePageShow(event: PageTransitionEvent) {
  if (event.persisted) {
    syncMotionPreference();
  }
}

if (typeof reduceMotionQuery.addEventListener === "function") {
  reduceMotionQuery.addEventListener("change", syncMotionPreference);
} else {
  reduceMotionQuery.addListener(syncMotionPreference);
}

document.addEventListener("click", handleAnchorClick);
window.addEventListener("pagehide", handlePageHide);
window.addEventListener("pageshow", handlePageShow);
startSmoothScroll();
