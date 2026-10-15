/* ============================================================
   App 2 — SQL Query Simulator & Playground
   Supports: SELECT, INSERT INTO, UPDATE ... SET ... WHERE
   ============================================================ */
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

let TABLES = {};      // working copy, mutated by INSERT / UPDATE
let ORIGINAL = {};    // pristine copy for Reset

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */
const clone = (obj) => JSON.parse(JSON.stringify(obj));

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Coerce a literal token into string | number | null */
function parseValue(raw) {
  const v = raw.trim().replace(/^['"]|['"]$/g, '');
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (/^null$/i.test(v)) return null;
  return v;
}

/* ------------------------------------------------------------
   Mini SQL parser
   ------------------------------------------------------------ */
function runQuery(sqlRaw) {
  const sql = sqlRaw.trim().replace(/;+\s*$/, '');
  if (!sql) throw new Error('Query is empty.');

  const upper = sql.toUpperCase();

  if (upper.startsWith('SELECT')) return runSelect(sql);
  if (upper.startsWith('INSERT')) return runInsert(sql);
  if (upper.startsWith('UPDATE')) return runUpdate(sql);
  if (upper.startsWith('DELETE')) return runDelete(sql);

  throw new Error('Only SELECT, INSERT, UPDATE and DELETE are supported.');
}

/* ---------- SELECT ---------- */
function runSelect(sql) {
  // SELECT <cols> FROM <table> [WHERE col op val] [ORDER BY col [ASC|DESC]] [LIMIT n]
  const m = sql.match(
    /^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(\w+)\s*(=|!=|<>|>=|<=|>|<)\s*(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?\s*$/i
  );
  if (!m) throw new Error('Could not parse SELECT. Check your syntax.');

  const [, colsRaw, table, whereCol, whereOp, whereVal, orderCol, orderDir, limit] = m;

  if (!TABLES[table]) {
    throw new Error(`Table "${table}" does not exist. Available: ${Object.keys(TABLES).join(', ')}`);
  }

  let rows = clone(TABLES[table]);

  // WHERE
  if (whereCol) {
    const target = parseValue(whereVal);
    rows = rows.filter((r) => compare(r[whereCol], target, whereOp, whereCol));
  }

  // ORDER BY
  if (orderCol) {
    const dir = (orderDir || 'ASC').toUpperCase() === 'DESC' ? -1 : 1;
    rows.sort((a, b) => {
      const x = a[orderCol], y = b[orderCol];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y)) * dir;
    });
  }

  // LIMIT
  if (limit) rows = rows.slice(0, Number(limit));

  // Column projection
  let columns;
  if (colsRaw.trim() === '*') {
    columns = rows.length ? Object.keys(rows[0]) : (TABLES[table][0] ? Object.keys(TABLES[table][0]) : []);
  } else {
    columns = colsRaw.split(',').map((c) => c.trim());
    columns.forEach((c) => {
      if (rows.length && !(c in rows[0])) throw new Error(`Unknown column "${c}".`);
    });
    rows = rows.map((r) => {
      const out = {};
      columns.forEach((c) => (out[c] = r[c]));
      return out;
    });
  }

  return { type: 'select', columns, rows, message: `${rows.length} row(s) returned.` };
}

/* ---------- INSERT ---------- */
function runInsert(sql) {
  // INSERT INTO <table> (c1, c2) VALUES (v1, v2)
  // or INSERT INTO <table> VALUES (v1, v2, ...)
  const m = sql.match(
    /^INSERT\s+INTO\s+(\w+)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([^)]+)\)\s*$/i
  );
  if (!m) throw new Error('Could not parse INSERT. Use: INSERT INTO table (col1, col2) VALUES (v1, v2)');

  const [, table, colsRaw, valsRaw] = m;
  if (!TABLES[table]) {
    throw new Error(`Table "${table}" does not exist. Available: ${Object.keys(TABLES).join(', ')}`);
  }

  const cols = colsRaw
    ? colsRaw.split(',').map((c) => c.trim())
    : Object.keys(TABLES[table][0] || {});

  const vals = splitValues(valsRaw);
  if (cols.length !== vals.length) {
    throw new Error(`Column count (${cols.length}) does not match value count (${vals.length}).`);
  }

  const record = {};
  cols.forEach((c, i) => (record[c] = parseValue(vals[i])));

  // Auto-increment the id if the table uses one
  if ('id' in (TABLES[table][0] || {}) && !record.id) {
    record.id = Math.max(0, ...TABLES[table].map((r) => Number(r.id) || 0)) + 1;
  }

  TABLES[table].push(record);

  return {
    type: 'insert',
    columns: Object.keys(record),
    rows: [record],
    message: `1 row inserted into "${table}".`
  };
}

/* ---------- UPDATE ---------- */
function runUpdate(sql) {
  const m = sql.match(
    /^UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(\w+)\s*(=|!=|<>|>=|<=|>|<)\s*(.+?))?\s*$/i
  );
  if (!m) throw new Error('Could not parse UPDATE. Use: UPDATE table SET col = val WHERE col = val');

  const [, table, setRaw, whereCol, whereOp, whereVal] = m;
  if (!TABLES[table]) {
    throw new Error(`Table "${table}" does not exist. Available: ${Object.keys(TABLES).join(', ')}`);
  }

  // Parse "col = val, col2 = val2"
  const assignments = setRaw.split(',').map((pair) => {
    const [col, val] = pair.split('=');
    if (!col || val === undefined) throw new Error(`Bad assignment: "${pair.trim()}"`);
    return { col: col.trim(), value: parseValue(val) };
  });

  const target = whereCol ? parseValue(whereVal) : null;
  let affected = 0;
  const changed = [];

  TABLES[table].forEach((row) => {
    if (whereCol && !compare(row[whereCol], target, whereOp, whereCol)) return;
    assignments.forEach((a) => (row[a.col] = a.value));
    affected++;
    changed.push({ ...row });
  });

  return {
    type: 'update',
    columns: changed.length ? Object.keys(changed[0]) : [],
    rows: changed,
    message: `${affected} row(s) updated in "${table}".`
  };
}

/* ---------- DELETE ---------- */
function runDelete(sql) {
  const m = sql.match(
    /^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(\w+)\s*(=|!=|<>|>=|<=|>|<)\s*(.+?))?\s*$/i
  );
  if (!m) throw new Error('Could not parse DELETE. Use: DELETE FROM table WHERE col = val');

  const [, table, whereCol, whereOp, whereVal] = m;
  if (!TABLES[table]) throw new Error(`Table "${table}" does not exist.`);

  const before = TABLES[table].length;
  const target = whereCol ? parseValue(whereVal) : null;

  TABLES[table] = TABLES[table].filter((row) => {
    if (!whereCol) return false;
    return !compare(row[whereCol], target, whereOp, whereCol);
  });

  const removed = before - TABLES[table].length;
  return { type: 'delete', columns: [], rows: [], message: `${removed} row(s) deleted from "${table}".` };
}

/* ---------- Comparison + value splitting ---------- */
function compare(a, b, op, colName) {
  if (a === undefined) throw new Error(`Unknown column "${colName}".`);

  const numA = Number(a), numB = Number(b);
  const bothNumeric = !isNaN(numA) && !isNaN(numB) && a !== '' && b !== '';

  const x = bothNumeric ? numA : String(a).toLowerCase();
  const y = bothNumeric ? numB : String(b).toLowerCase();

  switch (op) {
    case '=':  return x === y;
    case '!=':
    case '<>': return x !== y;
    case '>':  return x > y;
    case '<':  return x < y;
    case '>=': return x >= y;
    case '<=': return x <= y;
    default: throw new Error(`Unsupported operator "${op}".`);
  }
}

/** Split "a, 'b, c', 3" respecting quotes */
function splitValues(raw) {
  const out = [];
  let cur = '';
  let quote = null;

  for (const ch of raw) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ',') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim() || raw.endsWith(',')) out.push(cur.trim());
  return out;
}

/* ------------------------------------------------------------
   Rendering
   ------------------------------------------------------------ */
function renderResult(result) {
  const box = $('#resultBox');
  const badge = $('#rowsBadge');
  const title = $('#resultTitle');

  title.textContent = result.type.toUpperCase() + ' Result';
  badge.textContent = result.message;

  if (result.type !== 'select' && !result.rows.length) {
    box.innerHTML = `<div class="msg ok">✔ ${escapeHtml(result.message)}</div>`;
    return;
  }

  if (!result.rows.length) {
    box.innerHTML = '<p class="empty">0 rows matched your query.</p>';
    return;
  }

  const cols = result.columns.length ? result.columns : Object.keys(result.rows[0]);

  const head = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
  const body = result.rows.map((row) =>
    '<tr>' + cols.map((c) => {
      const v = row[c];
      const isNum = typeof v === 'number';
      const text = v === null || v === undefined ? 'NULL' : String(v);
      return `<td class="${isNum ? 'num' : ''}">${escapeHtml(text)}</td>`;
    }).join('') + '</tr>'
  ).join('');

  box.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderError(message) {
  $('#resultTitle').textContent = 'Error';
  $('#rowsBadge').textContent = '';
  $('#resultBox').innerHTML = `<div class="msg err">✖ ${escapeHtml(message)}</div>`;
}

function pushHistory(sql, ok) {
  const list = $('#history');
  const empty = $('.empty', list);
  if (empty) empty.remove();

  const li = document.createElement('li');
  li.className = ok ? '' : 'bad';
  li.textContent = (ok ? '✔ ' : '✖ ') + sql;
  list.prepend(li);

  while (list.children.length > 10) list.lastElementChild.remove();
}

/* ------------------------------------------------------------
   Execute
   ------------------------------------------------------------ */
function execute() {
  const sql = $('#sqlInput').value.trim();
  if (!sql) return;

  try {
    const result = runQuery(sql);
    renderResult(result);
    pushHistory(sql, true);
  } catch (err) {
    renderError(err.message);
    pushHistory(sql, false);
  }
}

/* ------------------------------------------------------------
   Sample queries from data.json
   ------------------------------------------------------------ */
function renderSamples(examples) {
  const box = $('#samples');
  box.innerHTML = examples
    .map((q) => `<button class="sample" type="button">${escapeHtml(q)}</button>`)
    .join('');

  box.addEventListener('click', (e) => {
    const btn = e.target.closest('.sample');
    if (!btn) return;
    $('#sqlInput').value = btn.textContent;
    execute();
  });
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
async function init() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    TABLES = clone(data.tables);
    ORIGINAL = clone(data.tables);

    renderSamples(data.examples || []);
    $('#sqlInput').value = (data.examples && data.examples[0]) || 'SELECT * FROM students';
    execute();
  } catch (err) {
    console.error('[app2] data.json failed:', err);
    renderError('Could not load data.json. Run this from a local server or GitHub Pages.');
  }
}

$('#runBtn').addEventListener('click', execute);

$('#resetBtn').addEventListener('click', () => {
  TABLES = clone(ORIGINAL);
  $('#resultTitle').textContent = 'Result';
  $('#rowsBadge').textContent = '';
  $('#resultBox').innerHTML = '<p class="empty">Tables reset. Run a query to continue.</p>';
  $('#history').innerHTML = '<li class="empty">No queries yet.</li>';
});

// Ctrl/Cmd + Enter runs the query
$('#sqlInput').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    execute();
  }
});

init();