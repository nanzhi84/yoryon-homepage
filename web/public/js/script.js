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
