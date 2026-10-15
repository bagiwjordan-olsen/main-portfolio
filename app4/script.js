/* ============================================================
   App 4 — Java OOP Concept & Syntax Reference Tool
   ============================================================ */
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

let TOPICS = [];
let ACTIVE_CATEGORY = 'All';
let SEARCH_TERM = '';

const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------
   Filter + render
   ------------------------------------------------------------ */
function filtered() {
  const term = SEARCH_TERM.toLowerCase();

  return TOPICS.filter((t) => {
    const catOk = ACTIVE_CATEGORY === 'All' || t.category === ACTIVE_CATEGORY;
    if (!catOk) return false;
    if (!term) return true;

    const haystack = [t.title, t.category, t.desc, t.code].join(' ').toLowerCase();
    return haystack.includes(term);
  });
}

function render() {
  const list = filtered();
  const grid = $('#topics');
  const empty = $('#emptyMsg');

  $('#count').textContent = `${list.length} of ${TOPICS.length} topics`;

  if (!list.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = list.map((t) => `
    <article class="topic">
      <div class="topic-top">
        <h3>${escapeHtml(t.title)}</h3>
        <span class="badge">${escapeHtml(t.category)}</span>
      </div>
      <p>${escapeHtml(t.desc)}</p>
      <div class="code-block">
        <div class="code-head">
          <span>Java</span>
          <button class="copy-btn" type="button" data-code="${encodeURIComponent(t.code)}">Copy</button>
        </div>
        <pre><code>${escapeHtml(t.code)}</code></pre>
      </div>
    </article>
  `).join('');
}

/* ------------------------------------------------------------
   Category filter buttons
   ------------------------------------------------------------ */
function renderFilters(categories) {
  const box = $('#filters');
  const all = ['All', ...categories];

  box.innerHTML = all
    .map((c) => `<button class="filter${c === 'All' ? ' active' : ''}" type="button" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join('');

  box.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    ACTIVE_CATEGORY = btn.dataset.cat;
    $$('.filter').forEach((b) => b.classList.toggle('active', b === btn));
    render();
  });
}

/* ------------------------------------------------------------
   Copy to clipboard
   ------------------------------------------------------------ */
async function copyText(text, btn) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for http:// and older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }

    const original = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1400);
  } catch (err) {
    console.error('Copy failed:', err);
    btn.textContent = 'Failed';
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  copyText(decodeURIComponent(btn.dataset.code), btn);
});

/* ------------------------------------------------------------
   Search input (debounced)
   ------------------------------------------------------------ */
let searchTimer;
$('#search').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const value = e.target.value;
  searchTimer = setTimeout(() => {
    SEARCH_TERM = value.trim();
    render();
  }, 160);
});

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
async function init() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    TOPICS = data.topics || [];
    renderFilters(data.categories || []);
    render();
  } catch (err) {
    console.error('[app4] data.json failed:', err);
    $('#topics').innerHTML =
      '<p class="empty">Could not load data.json. Serve the folder over HTTP or deploy to GitHub Pages.</p>';
  }
}

init();