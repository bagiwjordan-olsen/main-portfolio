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

  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

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
   3. Fade-in sections on scroll — SAFE VERSION
   Content stays visible if anything goes wrong.
   ------------------------------------------------------------ */
function initReveal() {
  const items = $$('.reveal');
  if (!items.length) return;

  // If the browser doesn't support IntersectionObserver,
  // leave everything visible — no animation, no blanking.
  if (!('IntersectionObserver' in window)) return;

  // Hide only elements that are currently below the fold.
  // Anything already in view stays visible (no flash on load).
  items.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inViewport) el.classList.add('reveal--armed');
  });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => entry.target.classList.add('visible'), i * 70);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
  );

  items.forEach((el) => observer.observe(el));

  // Belt-and-suspenders: if for any reason IO never fires,
  // un-hide everything in view after 1.5 seconds.
  setTimeout(() => {
    items.forEach((el) => {
      if (!el.classList.contains('reveal--armed')) return;
      if (el.classList.contains('visible')) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.4) {
        el.classList.add('visible');
      }
    });
  }, 1500);
}

/* ------------------------------------------------------------
   4. Hero typewriter effect
   ------------------------------------------------------------ */
function initTypewriter(roles) {
  const target = $('#typewriter');
  if (!target || !roles || !roles.length) return;

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
   7. Project details modal — FIXED
   Uses .open class instead of the hidden attribute so the
   transition plays and the overlay never sits on top of
   the page when closed.
   ------------------------------------------------------------ */
let projectCache = [];

function initModal() {
  const overlay = $('#modalOverlay');
  if (!overlay) return;

  const closeBtn = $('#modalClose');
  const cancelBtn = $('#modalCancel');

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

    // Make it visible in the same frame so the transition fires
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    void overlay.offsetHeight;      // force reflow
    overlay.classList.add('open');
    if (closeBtn) closeBtn.focus();
  };

  const closeModal = () => {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    // Hide again after the fade completes
    setTimeout(() => { overlay.hidden = true; }, 320);
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="details"]');
    if (!btn) return;
    const project = projectCache.find((p) => p.id === btn.dataset.id);
    if (project) openModal(project);
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });
}

/* ------------------------------------------------------------
   8. LIVE VISITOR COUNTER
   ------------------------------------------------------------ */
async function initVisitorCounter() {
  const countEl = $('#visitorCount');
  const noteEl  = $('#counterNote');
  if (!countEl) return;

  const NAMESPACE = 'diedericholsen-portfolio-kcp';
  const KEY       = 'homepage';
  const ENDPOINT  = `https://api.counterapi.dev/v1/${NAMESPACE}/${KEY}/up`;
  const LOCAL_KEY = 'do_portfolio_visits';

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
      if (noteEl) noteEl.textContent = 'live · counterapi.dev';
      localStorage.setItem(LOCAL_KEY, String(value));
      return;
    }
    throw new Error('Unexpected counter payload');
  } catch (err) {
    console.warn('[visitor-counter] live API unavailable:', err.message);
  }

  // Offline / blocked fallback
  let local = parseInt(localStorage.getItem(LOCAL_KEY) || '0', 10);
  local = Number.isFinite(local) ? local + 1 : 1;
  localStorage.setItem(LOCAL_KEY, String(local));

  countEl.textContent = local.toLocaleString();
  if (noteEl) noteEl.textContent = 'local count';
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
    const card = contactEmail.closest('.contact-card');
    if (card) card.href = `mailto:${profile.email}`;
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
  // These three are wrapped in try/catch so one failure
  // can never stop the rest of the page from working.
  try { initNav(); }          catch (e) { console.warn('nav:', e); }
  try { initHeaderScroll(); } catch (e) { console.warn('header:', e); }
  try { initModal(); }        catch (e) { console.warn('modal:', e); }

  // Visitor counter runs in parallel (fire-and-forget)
  initVisitorCounter().catch(() => {});

  // Load the JSON content
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('data.json not found (' + res.status + ')');
    const data = await res.json();

    initFooterAndContact(data.profile);

    if (data.profile && Array.isArray(data.profile.roles)) {
      initTypewriter(data.profile.roles);
    }

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

  // Final safety pass — reveal everything in view.
  initReveal();
}

document.addEventListener('DOMContentLoaded', init);
