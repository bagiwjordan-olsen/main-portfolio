/* ============================================================
   Diederich Olsen — Portfolio
   script.js  (root)
   Vanilla ES6. No dependencies. No build step.
   ============================================================ */

'use strict';

/* ------------------------------------------------------------
   0. Small helpers
   ------------------------------------------------------------ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/** Escape text before injecting into innerHTML. */
const esc = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/* ------------------------------------------------------------
   1. Mobile navigation
   ------------------------------------------------------------ */
function initNav() {
  const toggle = $('#navToggle');
  const links  = $('#navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Close the menu after choosing a link
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!links.classList.contains('open')) return;
    if (e.target.closest('.nav')) return;
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  });
}

/* ------------------------------------------------------------
   2. Header shadow on scroll
   ------------------------------------------------------------ */
function initHeaderScroll() {
  const header = $('.site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ------------------------------------------------------------
   3. Fade-in sections on scroll
   ------------------------------------------------------------ */
function initReveal() {
  const items = $$('.reveal');
  if (!items.length) return;

  // Fallback for very old browsers
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        // Small stagger so groups fade in nicely
        setTimeout(() => entry.target.classList.add('visible'), i * 70);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
  );

  items.forEach((el) => observer.observe(el));
}

/* ------------------------------------------------------------
   4. Hero typewriter effect
   ------------------------------------------------------------ */
function initTypewriter(roles) {
  const target = $('#typewriter');
  if (!target || !roles || !roles.length) return;

  // Respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.textContent = roles[0];
    return;
  }

  let roleIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const TYPE_SPEED   = 68;
  const DELETE_SPEED = 34;
  const HOLD_FULL    = 1500;
  const HOLD_EMPTY   = 380;

  function tick() {
    const current = roles[roleIndex];

    if (!deleting) {
      charIndex++;
      target.textContent = current.slice(0, charIndex);

      if (charIndex === current.length) {
        deleting = true;
        return setTimeout(tick, HOLD_FULL);
      }
      return setTimeout(tick, TYPE_SPEED);
    }

    charIndex--;
    target.textContent = current.slice(0, charIndex);

    if (charIndex === 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      return setTimeout(tick, HOLD_EMPTY);
    }
    return setTimeout(tick, DELETE_SPEED);
  }

  setTimeout(tick, 600);
}

/* ------------------------------------------------------------
   5. Render skills from data.json
   ------------------------------------------------------------ */
function renderSkills(skills) {
  const grid = $('#skillsGrid');
  if (!grid) return;

  if (!skills || !skills.length) {
    grid.innerHTML = '<p class="section-sub">No skills found in data.json.</p>';
    return;
  }

  grid.innerHTML = skills
    .map(
      (s) => `
      <article class="skill-card reveal">
        <div class="skill-top">
          <div class="skill-icon" aria-hidden="true">${esc(s.icon)}</div>
          <h3 class="skill-title">${esc(s.title)}</h3>
        </div>
        <p class="skill-desc">${esc(s.desc)}</p>
        <div class="skill-bar">
          <span class="skill-fill" data-level="${Number(s.level) || 0}"></span>
        </div>
        <div class="skill-meta">
          <span>${esc(s.category || 'Skill')}</span>
          <span>${Number(s.level) || 0}%</span>
        </div>
        <div class="skill-tags">
          ${(s.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}
        </div>
      </article>`
    )
    .join('');

  // Animate the progress bars after they enter the viewport
  requestAnimationFrame(() => {
    const fills = $$('.skill-fill', grid);
    if (!('IntersectionObserver' in window)) {
      fills.forEach((f) => (f.style.width = f.dataset.level + '%'));
      return;
    }
    const barObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.width = entry.target.dataset.level + '%';
            barObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    fills.forEach((f) => barObserver.observe(f));
  });

  initReveal();
}

/* ------------------------------------------------------------
   6. Render project cards from data.json
   ------------------------------------------------------------ */
function renderProjects(projects) {
  const grid = $('#projectsGrid');
  if (!grid) return;

  if (!projects || !projects.length) {
    grid.innerHTML = '<p class="section-sub">No projects found in data.json.</p>';
    return;
  }

  grid.innerHTML = projects
    .map(
      (p) => `
      <article class="project-card reveal" data-id="${esc(p.id)}">
        <div class="project-head">
          <div class="project-icon" aria-hidden="true">${esc(p.icon)}</div>
          <span class="project-num">${esc(p.num)}</span>
        </div>
        <h3 class="project-title">${esc(p.title)}</h3>
        <p class="project-short">${esc(p.short)}</p>
        <div class="project-tags">
          ${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}
        </div>
        <div class="project-actions">
          <button class="btn btn-outline" type="button" data-action="details" data-id="${esc(p.id)}">
            Details
          </button>
          <a class="btn btn-primary" href="${esc(p.path)}">Launch App</a>
        </div>
      </article>`
    )
    .join('');

  initReveal();
}

/* ------------------------------------------------------------
   7. Project details modal
   ------------------------------------------------------------ */
let projectCache = [];

function initModal() {
  const overlay = $('#modalOverlay');
  const closeBtn = $('#modalClose');
  const cancelBtn = $('#modalCancel');
  if (!overlay) return;

  const openModal = (project) => {
    $('#modalBadge').textContent  = project.num;
    $('#modalTitle').textContent  = project.title;
    $('#modalDesc').textContent   = project.desc;
    $('#modalLaunch').href        = project.path;
    $('#modalLaunch').textContent = `Launch ${project.title.split(' ')[0]} App`;

    $('#modalTags').innerHTML = (project.tags || [])
      .map((t) => `<span>${esc(t)}</span>`)
      .join('');

    $('#modalFeatures').innerHTML = (project.features || [])
      .map((f) => `<li>${esc(f)}</li>`)
      .join('');

    overlay.classList.add('open');   // <-- replaces overlay.hidden = false
  document.body.style.overflow = 'hidden';
  void overlay.offsetHeight;
  closeBtn.focus();
  };

  const closeModal = () => {
  overlay.classList.remove('open');  // <-- replaces overlay.hidden = true
  document.body.style.overflow = '';
};

  };

  // Delegate clicks from the project grid
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="details"]');
    if (!btn) return;
    const project = projectCache.find((p) => p.id === btn.dataset.id);
    if (project) openModal(project);
  });

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });
}

/* ------------------------------------------------------------
   8. LIVE VISITOR COUNTER
   Primary : api.counterapi.dev  (free, no key)
   Fallback: localStorage counter so the badge is never blank
   Badge   : hitscounter.dev image in the footer
   ------------------------------------------------------------ */
async function initVisitorCounter() {
  const countEl = $('#visitorCount');
  const noteEl  = $('#counterNote');
  if (!countEl) return;

  const NAMESPACE = 'diedericholsen-portfolio-kcp';
  const KEY       = 'homepage';
  const ENDPOINT  = `https://api.counterapi.dev/v1/${NAMESPACE}/${KEY}/up`;
  const LOCAL_KEY = 'do_portfolio_visits';

  // ---- 1. Try the live API first -------------------------------
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(ENDPOINT, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('Counter API responded ' + res.status);

    const data = await res.json();
    const value = data.count ?? data.value ?? data.up_count ?? 0;

    if (typeof value === 'number' && value > 0) {
      countEl.textContent = value.toLocaleString();
      noteEl.textContent  = 'live · counterapi.dev';
      localStorage.setItem(LOCAL_KEY, String(value));
      return;
    }
    throw new Error('Unexpected counter payload');
  } catch (err) {
    // Silent — we fall through to the local counter.
    console.warn('[visitor-counter] live API unavailable:', err.message);
  }

  // ---- 2. Offline / blocked fallback ---------------------------
  let local = parseInt(localStorage.getItem(LOCAL_KEY) || '0', 10);
  local = Number.isFinite(local) ? local + 1 : 1;
  localStorage.setItem(LOCAL_KEY, String(local));

  countEl.textContent = local.toLocaleString();
  noteEl.textContent  = 'local count';
}

/* ------------------------------------------------------------
   9. Footer year + contact links from data.json
   ------------------------------------------------------------ */
function initFooterAndContact(profile) {
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!profile) return;

  const emailEl = $('#heroEmail');
  if (emailEl && profile.email) emailEl.href = `mailto:${profile.email}`;

  const contactEmail = $('#contactEmail');
  if (contactEmail && profile.email) {
    contactEmail.textContent = profile.email;
    contactEmail.closest('.contact-card').href = `mailto:${profile.email}`;
  }

  const ghCard = $('#contactGithub');
  const ghText = $('#contactGithubText');
  if (ghCard && profile.github) ghCard.href = profile.github;
  if (ghText && profile.githubText) ghText.textContent = profile.githubText;

  const loc = $('#contactLocation');
  if (loc && profile.location) loc.textContent = profile.location;

  const bio = $('#heroBio');
  if (bio && profile.bio) bio.textContent = profile.bio;

  const name = $('#heroName');
  if (name && profile.name) name.textContent = profile.name;
}

/* ------------------------------------------------------------
   10. Boot
   ------------------------------------------------------------ */
async function init() {
  initNav();
  initHeaderScroll();
  initModal();

  // Visitor counter runs in parallel with the data fetch
  initVisitorCounter();

  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('data.json not found (' + res.status + ')');
    const data = await res.json();

    // Profile / contact
    initFooterAndContact(data.profile);

    // Typewriter roles
    if (data.profile && Array.isArray(data.profile.roles)) {
      initTypewriter(data.profile.roles);
    }

    // Skills + projects
    renderSkills(data.skills);
    renderProjects(data.projects);
    projectCache = Array.isArray(data.projects) ? data.projects : [];
  } catch (err) {
    console.error('[portfolio] Failed to load data.json:', err);
    const grid = $('#skillsGrid');
    if (grid) {
      grid.innerHTML =
        '<p class="section-sub">Could not load <code>data.json</code>. ' +
        'If you opened this file directly, run a local server ' +
        '(e.g. <code>python -m http.server</code>) or deploy to GitHub Pages.</p>';
    }
  }

  // Reveal any static .reveal elements (hero, about, contact)
  initReveal();
}

document.addEventListener('DOMContentLoaded', init);
