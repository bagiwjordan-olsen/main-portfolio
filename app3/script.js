/* ============================================================
   App 3 — OS Memory Allocation Visualizer
   First-Fit · Best-Fit · Worst-Fit
   ============================================================ */
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

let DEFAULT_BLOCKS = [];
let DEFAULT_PROCS  = [];

/* ------------------------------------------------------------
   Read the editable inputs
   ------------------------------------------------------------ */
function readBlocks() {
  return $$('#blocks .item').map((el, i) => ({
    id: el.dataset.id || 'B' + (i + 1),
    size: parseInt($('input', el).value, 10) || 0
  })).filter((b) => b.size > 0);
}

function readProcs() {
  return $$('#processes .item').map((el, i) => ({
    id: el.dataset.id || 'P' + (i + 1),
    size: parseInt($('input', el).value, 10) || 0
  })).filter((p) => p.size > 0);
}

/* ------------------------------------------------------------
   Build the editable lists
   ------------------------------------------------------------ */
function buildBlocks(list) {
  $('#blocks').innerHTML = list.map((b) => `
    <div class="item" data-id="${b.id}">
      <span class="item-tag">${b.id}</span>
      <input type="number" min="1" step="10" value="${b.size}" aria-label="${b.id} size">
      <span></span>
    </div>
  `).join('');
}

function buildProcs(list) {
  $('#processes').innerHTML = list.map((p) => `
    <div class="item proc" data-id="${p.id}">
      <span class="item-tag">${p.id}</span>
      <input type="number" min="1" step="10" value="${p.size}" aria-label="${p.id} size">
      <span></span>
    </div>
  `).join('');
}

/* ------------------------------------------------------------
   Allocation algorithms — each returns
   { blocks: [{ id, size, process|null, used, free }], unallocated: [ids] }
   ------------------------------------------------------------ */
function allocate(blocks, procs, strategy) {
  // Fresh working copy of the blocks
  const work = blocks.map((b) => ({ ...b, process: null, used: 0 }));
  const unallocated = [];

  procs.forEach((proc) => {
    let chosen = -1;

    for (let i = 0; i < work.length; i++) {
      const b = work[i];
      const free = b.size - b.used;

      if (b.process !== null) continue;   // block already taken (single-process blocks)
      if (b.size < proc.size) continue;

      if (chosen === -1) {
        chosen = i;
      } else {
        const bestFree = work[chosen].size;
        if (strategy === 'best' && b.size < bestFree) chosen = i;
        if (strategy === 'worst' && b.size > bestFree) chosen = i;
      }

      // First-fit stops at the first viable block
      if (strategy === 'first') break;
    }

    if (chosen === -1) {
      unallocated.push(proc.id);
    } else {
      work[chosen].process = proc.id;
      work[chosen].used = proc.size;
    }
  });

  work.forEach((b) => { b.free = b.size - b.used; });

  return { blocks: work, unallocated };
}

/* ------------------------------------------------------------
   Render one algorithm panel
   ------------------------------------------------------------ */
function renderAlgo(title, desc, result) {
  const totalFree = result.blocks.reduce((s, b) => s + b.free, 0);
  const totalMem  = result.blocks.reduce((s, b) => s + b.size, 0);
  const usedPct   = totalMem ? Math.round(((totalMem - totalFree) / totalMem) * 100) : 0;

  const segments = result.blocks.map((b) => {
    const pct = totalMem ? (b.size / totalMem) * 100 : 0;

    if (b.process) {
      // Allocated portion + leftover fragment inside the same block
      const fragPct = pct * (b.free / b.size);
      const usedPart = pct - fragPct;

      return `
        <div class="seg used" style="flex:${usedPart}" title="${b.id}: ${b.process} (${b.used}K)">${b.process}</div>
        ${b.free > 0
          ? `<div class="seg free" style="flex:${fragPct}" title="${b.id}: ${b.free}K free">${b.free}K</div>`
          : ''}
      `;
    }
    return `<div class="seg free" style="flex:${pct}" title="${b.id}: ${b.size}K free">${b.size}K</div>`;
  }).join('');

  const labels = result.blocks.map((b) => `${b.id}:${b.size}K`).join('  ·  ');

  const unalloc = result.unallocated.length
    ? `<span style="color:var(--bad)">${result.unallocated.join(', ')}</span>`
    : '<span style="color:var(--ok)">all placed</span>';

  return `
    <article class="algo">
      <h3>${title}</h3>
      <p class="algo-desc">${desc}</p>
      <div class="block-bar">${segments}</div>
      <div class="block-label">${labels}</div>
      <div class="stat-row"><span>Memory utilization</span><b>${usedPct}%</b></div>
      <div class="stat-row"><span>Total free / fragmentation</span><b>${totalFree}K</b></div>
      <div class="stat-row"><span>Unallocated processes</span><b>${unalloc}</b></div>
    </article>
  `;
}

/* ------------------------------------------------------------
   Run all three and render
   ------------------------------------------------------------ */
function runAll() {
  const blocks = readBlocks();
  const procs  = readProcs();

  if (!blocks.length || !procs.length) {
    $('#output').innerHTML =
      '<p class="empty">Add at least one memory block and one process.</p>';
    return;
  }

  const first = allocate(blocks, procs, 'first');
  const best  = allocate(blocks, procs, 'best');
  const worst = allocate(blocks, procs, 'worst');

  $('#output').innerHTML =
    renderAlgo('First-Fit', 'Places each process into the first block big enough for it.', first) +
    renderAlgo('Best-Fit',  'Places each process into the smallest block that still fits.', best) +
    renderAlgo('Worst-Fit', 'Places each process into the largest available block.', worst);
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
async function init() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    DEFAULT_BLOCKS = data.blocks || [];
    DEFAULT_PROCS  = data.processes || [];

    buildBlocks(DEFAULT_BLOCKS);
    buildProcs(DEFAULT_PROCS);
    runAll();
  } catch (err) {
    console.error('[app3] data.json failed:', err);
    DEFAULT_BLOCKS = [
      { id: 'B1', size: 100 }, { id: 'B2', size: 500 },
      { id: 'B3', size: 200 }, { id: 'B4', size: 300 },
      { id: 'B5', size: 600 }
    ];
    DEFAULT_PROCS = [
      { id: 'P1', size: 212 }, { id: 'P2', size: 417 },
      { id: 'P3', size: 112 }, { id: 'P4', size: 426 }
    ];
    buildBlocks(DEFAULT_BLOCKS);
    buildProcs(DEFAULT_PROCS);
    runAll();
  }
}

$('#runBtn').addEventListener('click', runAll);

$('#resetBtn').addEventListener('click', () => {
  buildBlocks(DEFAULT_BLOCKS);
  buildProcs(DEFAULT_PROCS);
  runAll();
});

// Live re-run when inputs change
document.addEventListener('input', (e) => {
  if (e.target.closest('.item')) runAll();
});

init();