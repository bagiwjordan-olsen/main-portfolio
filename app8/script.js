/* ============================================================
   App 8 — CapCut Video Asset Tracker & Timecode Sync Tool
   ============================================================ */
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const STORAGE_KEY = 'do_capcut_tracker_v1';

let CLIPS = [];
let SETTINGS = {};

const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------
   Timecode helpers  (HH:MM:SS)
   ------------------------------------------------------------ */
function timecodeToSeconds(tc) {
  if (!tc) return 0;
  const parts = String(tc).trim().split(':').map(Number);
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return 0;

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function secondsToTimecode(total) {
  const s = Math.max(0, Math.round(total));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

/* ------------------------------------------------------------
   Persistence
   ------------------------------------------------------------ */
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      project: $('#projectName').value.trim() || 'Untitled Project',
      clips: CLIPS
    }));
  } catch (err) {
    console.warn('[app8] save failed:', err);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && Array.isArray(data.clips) ? data : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   Add a clip
   ------------------------------------------------------------ */
function addClip() {
  const name = $('#clipName').value.trim();
  if (!name) {
    $('#clipName').focus();
    return;
  }

  const startTc = $('#clipStart').value.trim() || '00:00:00';
  const durTc   = $('#clipDuration').value.trim() || '00:00:05';

  const startSec = timecodeToSeconds(startTc);
  const durSec   = timecodeToSeconds(durTc);

  CLIPS.push({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name,
    start: startTc,
    duration: durTc,
    end: secondsToTimecode(startSec + durSec),
    startSeconds: startSec,
    durationSeconds: durSec,
    brightness: Number($('#clipBrightness').value),
    contrast: Number($('#clipContrast').value),
    beat: $('#clipBeat').value.trim(),
    notes: $('#clipNotes').value.trim()
  });

  // Sort clips by start time
  CLIPS.sort((a, b) => a.startSeconds - b.startSeconds);

  // Reset the form (keep the timecode defaults handy)
  $('#clipName').value = '';
  $('#clipNotes').value = '';
  $('#clipBeat').value = '';
  $('#clipBrightness').value = 0;
  $('#clipContrast').value = 0;
  updateRangeLabels();
  $('#clipName').focus();

  save();
  render();
}

function deleteClip(id) {
  CLIPS = CLIPS.filter((c) => c.id !== id);
  save();
  render();
}

/* ------------------------------------------------------------
   Range sliders
   ------------------------------------------------------------ */
function updateRangeLabels() {
  $('#brightVal').textContent   = $('#clipBrightness').value;
  $('#contrastVal').textContent = $('#clipContrast').value;
}

/* ------------------------------------------------------------
   Render timeline
   ------------------------------------------------------------ */
function renderTimeline() {
  const box = $('#timeline');

  if (!CLIPS.length) {
    box.innerHTML = '<p class="empty">No clips yet. Add one above to build your timeline.</p>';
    return;
  }

  box.innerHTML = CLIPS.map((clip) => {
    // Width scales with duration (min 90px so short clips stay readable)
    const width = Math.max(90, Math.min(clip.durationSeconds * 14, 260));

    const beatMarker = clip.beat
      ? `<span class="tl-beat" title="Beat at ${escapeHtml(clip.beat)}"></span>`
      : '';

    return `
      <div class="tl-clip" style="width:${width}px" title="${escapeHtml(clip.name)} · ${escapeHtml(clip.start)} → ${escapeHtml(clip.end)}">
        <span class="tl-name">${escapeHtml(clip.name)}</span>
        <span class="tl-time">${escapeHtml(clip.start)} · ${escapeHtml(clip.duration)}</span>
        ${beatMarker}
      </div>
    `;
  }).join('');
}

/* ------------------------------------------------------------
   Render details table
   ------------------------------------------------------------ */
function renderTable() {
  const box = $('#tableBox');
  $('#clipCount').textContent = `${CLIPS.length} clip${CLIPS.length === 1 ? '' : 's'}`;

  if (!CLIPS.length) {
    box.innerHTML = '<p class="empty">Nothing to show yet.</p>';
    return;
  }

  const rows = CLIPS.map((c) => `
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td class="mono">${escapeHtml(c.start)}</td>
      <td class="mono">${escapeHtml(c.duration)}</td>
      <td class="mono">${escapeHtml(c.end)}</td>
      <td class="mono">${c.brightness > 0 ? '+' : ''}${c.brightness}</td>
      <td class="mono">${c.contrast > 0 ? '+' : ''}${c.contrast}</td>
      <td class="mono">${c.beat ? escapeHtml(c.beat) : '—'}</td>
      <td class="notes">${c.notes ? escapeHtml(c.notes) : '—'}</td>
      <td><button class="del-row" data-id="${c.id}" title="Delete clip">×</button></td>
    </tr>
  `).join('');

  box.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Clip</th><th>Start</th><th>Duration</th><th>End</th>
          <th>Bright</th><th>Contrast</th><th>Beat</th><th>Notes</th><th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/* ------------------------------------------------------------
   Render beat markers
   ------------------------------------------------------------ */
function renderBeats() {
  const beats = CLIPS.filter((c) => c.beat);
  const panel = $('#beatPanel');

  if (!beats.length) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;

  $('#beats').innerHTML = beats
    .map((c) => `<span class="beat-chip">${escapeHtml(c.beat)} · ${escapeHtml(c.name)}</span>`)
    .join('');
}

/* ------------------------------------------------------------
   Master render
   ------------------------------------------------------------ */
function render() {
  renderTimeline();
  renderTable();
  renderBeats();
}

/* ------------------------------------------------------------
   Export to JSON file
   ------------------------------------------------------------ */
function exportJSON() {
  const payload = {
    project: $('#projectName').value.trim() || 'Untitled Project',
    exportedAt: new Date().toISOString(),
    totalClips: CLIPS.length,
    totalDuration: secondsToTimecode(
      CLIPS.reduce((sum, c) => sum + c.durationSeconds, 0)
    ),
    editor: 'CapCut',
    clips: CLIPS.map((c) => ({
      name: c.name,
      start: c.start,
      duration: c.duration,
      end: c.end,
      brightness: c.brightness,
      contrast: c.contrast,
      audioBeat: c.beat || null,
      notes: c.notes || null
    }))
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download =
    payload.project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
    '-assets.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------
   Event wiring
   ------------------------------------------------------------ */
$('#addClipBtn').addEventListener('click', addClip);

$('#clipName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addClip();
});

$('#clipBrightness').addEventListener('input', updateRangeLabels);
$('#clipContrast').addEventListener('input', updateRangeLabels);

$('#tableBox').addEventListener('click', (e) => {
  const btn = e.target.closest('.del-row');
  if (btn) deleteClip(btn.dataset.id);
});

$('#exportBtn').addEventListener('click', exportJSON);

$('#clearBtn').addEventListener('click', () => {
  if (!CLIPS.length) return;
  if (confirm('Delete all clips? This cannot be undone.')) {
    CLIPS = [];
    save();
    render();
  }
});

$('#projectName').addEventListener('input', save);

$('#loadSampleBtn').addEventListener('click', () => {
  if (CLIPS.length && !confirm('Replace your current clips with the sample project?')) return;

  $('#projectName').value = 'IT Week Vlog 2025';
  CLIPS = (SETTINGS.sampleClips || []).map((c, i) => {
    const startSec = timecodeToSeconds(c.start);
    const durSec   = timecodeToSeconds(c.duration);
    return {
      id: 'sample-' + i,
      ...c,
      end: secondsToTimecode(startSec + durSec),
      startSeconds: startSec,
      durationSeconds: durSec
    };
  }).sort((a, b) => a.startSeconds - b.startSeconds);

  save();
  render();
});

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
async function init() {
  updateRangeLabels();

  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    SETTINGS = await res.json();

    // Restore a saved session, otherwise start empty
    const saved = load();
    if (saved) {
      $('#projectName').value = saved.project || 'Untitled Project';
      CLIPS = saved.clips;
    }
  } catch (err) {
    console.error('[app8] data.json failed:', err);
  }

  render();
}

init();