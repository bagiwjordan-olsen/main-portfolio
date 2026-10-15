/* ============================================================
   App 6 — Task & Assignment Kanban Board
   Data persisted in localStorage.
   ============================================================ */
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const STORAGE_KEY = 'do_kanban_v1';

let COLUMNS = [];        // [{ id, title, dotClass }]
let SUBJECTS = [];
let TASKS = [];          // [{ id, title, subject, priority, status }]
let dragId = null;

const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------
   Persistence
   ------------------------------------------------------------ */
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(TASKS));
  } catch (err) {
    console.warn('[app6] could not save to localStorage:', err);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   Render
   ------------------------------------------------------------ */
function render() {
  const board = $('#board');

  board.innerHTML = COLUMNS.map((col) => {
    const items = TASKS.filter((t) => t.status === col.id);

    const cards = items.length
      ? items.map((t) => `
          <article class="card${col.id === 'done' ? ' done' : ''}"
                   draggable="true" data-id="${t.id}">
            <span class="card-prio ${t.priority}"></span>
            <h4 class="card-title">${escapeHtml(t.title)}</h4>
            <div class="card-foot">
              <span class="subject-tag">${escapeHtml(t.subject)}</span>
              <div class="card-actions">
                <button class="mini" data-move="-1" title="Move left" ${col.id === COLUMNS[0].id ? 'disabled' : ''}>←</button>
                <button class="mini" data-move="1"  title="Move right" ${col.id === COLUMNS[COLUMNS.length - 1].id ? 'disabled' : ''}>→</button>
                <button class="mini del" data-del="1" title="Delete">×</button>
              </div>
            </div>
          </article>
        `).join('')
      : '<p class="empty-col">Drop a task here</p>';

    return `
      <section class="column" data-col="${col.id}">
        <header class="col-head">
          <span class="col-title">
            <span class="col-dot ${col.dotClass}"></span>${escapeHtml(col.title)}
          </span>
          <span class="col-count">${items.length}</span>
        </header>
        <div class="cards">${cards}</div>
      </section>
    `;
  }).join('');

  // Stats
  const done = TASKS.filter((t) => t.status === 'done').length;
  $('#stats').textContent =
    `${TASKS.length} task${TASKS.length === 1 ? '' : 's'} · ${done} completed · ` +
    `${TASKS.length ? Math.round((done / TASKS.length) * 100) : 0}% done`;

  attachDragHandlers();
}

/* ------------------------------------------------------------
   Drag & drop
   ------------------------------------------------------------ */
function attachDragHandlers() {
  $$('.card').forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      dragId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragId = null;
    });
  });

  $$('.column').forEach((col) => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
    });

    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');

      const id = e.dataTransfer.getData('text/plain') || dragId;
      const task = TASKS.find((t) => String(t.id) === String(id));
      if (!task) return;

      const newStatus = col.dataset.col;
      if (task.status === newStatus) return;

      task.status = newStatus;
      save();
      render();
    });
  });
}

/* ------------------------------------------------------------
   Task operations
   ------------------------------------------------------------ */
function addTask() {
  const input = $('#taskInput');
  const title = input.value.trim();
  if (!title) {
    input.focus();
    return;
  }

  TASKS.push({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    title,
    subject: $('#subjectSelect').value,
    priority: $('#prioritySelect').value,
    status: COLUMNS[0].id
  });

  input.value = '';
  input.focus();
  save();
  render();
}

function moveTask(id, direction) {
  const task = TASKS.find((t) => t.id === id);
  if (!task) return;

  const index = COLUMNS.findIndex((c) => c.id === task.status);
  const next = index + direction;
  if (next < 0 || next >= COLUMNS.length) return;

  task.status = COLUMNS[next].id;
  save();
  render();
}

function deleteTask(id) {
  TASKS = TASKS.filter((t) => t.id !== id);
  save();
  render();
}

/* ------------------------------------------------------------
   Delegated clicks on cards
   ------------------------------------------------------------ */
$('#board').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const id = card.dataset.id;

  const moveBtn = e.target.closest('[data-move]');
  if (moveBtn) {
    moveTask(id, Number(moveBtn.dataset.move));
    return;
  }

  if (e.target.closest('[data-del]')) {
    deleteTask(id);
  }
});

/* ------------------------------------------------------------
   Subject dropdown
   ------------------------------------------------------------ */
function fillSubjects(subjects) {
  $('#subjectSelect').innerHTML = subjects
    .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    .join('');
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
async function init() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    COLUMNS  = data.columns  || [];
    SUBJECTS = data.subjects || [];
    fillSubjects(SUBJECTS);

    // Restore saved tasks, otherwise use the seed tasks from JSON
    const saved = load();
    TASKS = saved !== null
      ? saved
      : (data.seedTasks || []).map((t, i) => ({ ...t, id: 'seed-' + i }));
  } catch (err) {
    console.error('[app6] data.json failed:', err);
    COLUMNS = [
      { id: 'todo',  title: 'To Do',       dotClass: 'todo' },
      { id: 'doing', title: 'In Progress', dotClass: 'doing' },
      { id: 'done',  title: 'Done',        dotClass: 'done' }
    ];
    SUBJECTS = ['General'];
    fillSubjects(SUBJECTS);
    TASKS = [];
  }

  render();
}

$('#addBtn').addEventListener('click', addTask);
$('#taskInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

$('#clearBtn').addEventListener('click', () => {
  if (!TASKS.length) return;
  if (confirm('Delete all tasks? This cannot be undone.')) {
    TASKS = [];
    save();
    render();
  }
});

init();