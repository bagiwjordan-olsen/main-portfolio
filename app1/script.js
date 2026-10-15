/* ============================================================
   App 1 — Grade & GWA Calculator
   ============================================================ */
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

let SCALE = [];
const PASSING = 3.00;   // Philippine college passing grade

/* ---------- Build one subject row ---------- */
function makeRow(name = '', units = 3, grade = '') {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `
    <input type="text"   class="f-name"  placeholder="e.g. Object-Oriented Programming" value="${name}">
    <input type="number" class="f-units" placeholder="3" min="1" max="9" step="1" value="${units}">
    <input type="number" class="f-grade" placeholder="1.00" min="1" max="5" step="0.01" value="${grade}">
    <button class="del" type="button" title="Remove subject" aria-label="Remove subject">×</button>
  `;

  row.querySelector('.del').addEventListener('click', () => {
    row.style.opacity = '0';
    setTimeout(() => { row.remove(); compute(); }, 180);
  });

  $$('input', row).forEach((inp) =>
    inp.addEventListener('input', compute)
  );

  $('#rows').appendChild(row);
  return row;
}

/* ---------- Read all rows ---------- */
function readRows() {
  return $$('.row').map((row) => ({
    name:  $('.f-name',  row).value.trim() || 'Untitled Subject',
    units: parseFloat($('.f-units', row).value) || 0,
    grade: parseFloat($('.f-grade', row).value)
  })).filter((r) => r.units > 0 && Number.isFinite(r.grade) && r.grade > 0);
}

/* ---------- Main computation ---------- */
function compute() {
  const rows = readRows();

  const totalUnits = rows.reduce((sum, r) => sum + r.units, 0);
  const weighted   = rows.reduce((sum, r) => sum + r.grade * r.units, 0);
  const gwa        = totalUnits > 0 ? weighted / totalUnits : null;

  // Stat cards
  $('#totalUnits').textContent = totalUnits;
  $('#gwa').textContent = gwa !== null ? gwa.toFixed(2) : '—';

  const statusEl = $('#status');
  if (gwa === null) {
    statusEl.textContent = '—';
    statusEl.style.color = '';
  } else if (gwa <= 1.45) {
    statusEl.textContent = 'Dean\'s Lister';
    statusEl.style.color = 'var(--gold)';
  } else if (gwa <= PASSING) {
    statusEl.textContent = 'Passed';
    statusEl.style.color = 'var(--ok)';
  } else {
    statusEl.textContent = 'Failed';
    statusEl.style.color = 'var(--bad)';
  }

  // Breakdown list
  const box = $('#breakdown');
  if (!rows.length) {
    box.innerHTML = '<p class="empty">No subjects yet. Add one above to see the breakdown.</p>';
    return;
  }

  box.innerHTML = rows.map((r) => {
    const passed = r.grade <= PASSING;
    return `
      <div class="b-item">
        <span class="b-name">${escapeHtml(r.name)}</span>
        <div class="b-right">
          <span class="b-grade">${r.units}u × ${r.grade.toFixed(2)}</span>
          <span class="pill ${passed ? 'pass' : 'fail'}">${passed ? 'PASS' : 'FAIL'}</span>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Grade scale note from JSON ---------- */
function renderScaleNote() {
  if (!SCALE.length) return;
  const el = $('#scaleNote');
  el.textContent =
    'Passing grade: ' + PASSING.toFixed(2) +
    ' · Scale loaded from data.json (' + SCALE.length + ' ranges)';
}

/* ---------- Load data.json ---------- */
async function loadData() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    SCALE = data.scale || [];
    renderScaleNote();

    // Pre-fill with sample subjects
    (data.sampleSubjects || []).forEach((s) =>
      makeRow(s.name, s.units, s.grade)
    );

    compute();
  } catch (err) {
    console.error('[app1] could not load data.json:', err);
    makeRow();
    compute();
  }
}

/* ---------- Wire up buttons ---------- */
$('#addRow').addEventListener('click', () => {
  makeRow();
  const rows = $$('.row');
  $('.f-name', rows[rows.length - 1]).focus();
});

$('#loadSample').addEventListener('click', async () => {
  $('#rows').innerHTML = '';
  try {
    const res = await fetch('./data.json');
    const data = await res.json();
    (data.sampleSubjects || []).forEach((s) => makeRow(s.name, s.units, s.grade));
  } catch {
    makeRow('Data Structures & Algorithms', 3, 1.75);
    makeRow('Object-Oriented Programming',  3, 1.50);
  }
  compute();
});

$('#clearAll').addEventListener('click', () => {
  $('#rows').innerHTML = '';
  makeRow();
  compute();
});

/* ---------- Boot ---------- */
loadData();