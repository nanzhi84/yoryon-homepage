const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.14,
  rootMargin: '0px 0px -40px 0px'
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
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      setMenuOpen(false);
    }
  });
}
