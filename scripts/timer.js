// ─── Data & State ───────────────────────────────────────────────────────────
const recordCumMs   = [];
const recordNames   = [];
const runHistory    = [];
const userSegMs     = [];
let availableSets   = [];
let MAX_SPLITS      = 0;
let elapsed         = 0;     // seconds for RTA timer
let timerInterval   = null;
let splitCount      = 0;
let cumulativeMs    = 0;     // ms for IG timer

// ─── DOM Refs (populated on init) ─────────────────────────────────────────
let comparisonSelect, loadComparisonBtn;
let rtaDisplay, cumDisplay, startStopBtn, resetBtn, undoBtn, exportBtn;
let inputs, tableBody;

// ─── Formatting Helpers ───────────────────────────────────────────────────
function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatMs(ms) {
  const h     = Math.floor(ms / 3600000);
  const m     = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
  const s     = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  const milli = (ms % 1000).toString().padStart(3, '0');
  return `${h}:${m}:${s}.${milli}`;
}

function formatSegMs(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  const milli   = (ms % 1000).toString().padStart(3, '0');
  return `${minutes}:${seconds}.${milli}`;
}

function parseSegmentMs(vals) {
  const [mStr, s1, s2, ms1, ms2, ms3] = vals;
  const minutes = parseInt(mStr, 10) || 0;
  const seconds = parseInt(s1 + s2, 10) || 0;
  const millis  = parseInt(ms1 + ms2 + ms3, 10) || 0;
  return minutes * 60000 + seconds * 1000 + millis;
}

// ─── Load available comparison sets ────────────────────────────────────────
async function loadComparisonIndex() {
  const res  = await fetch(`data/splits/index.csv?nocache=${Date.now()}`);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/).slice(1);
  for (const line of lines) {
    const [name, file] = line.split(',');
    availableSets.push({ name: name.trim(), file: file.trim() });
    const opt = document.createElement('option');
    opt.value       = file.trim();
    opt.textContent = name.trim();
    comparisonSelect.appendChild(opt);
  }
}

// ─── Load and lock in the chosen split set ─────────────────────────────────
async function loadSelectedComparison() {
  const file = comparisonSelect.value;
  if (!file) return;
  if (timerInterval || splitCount > 0) {
    alert('Please stop & reset the timer before changing comparisons.');
    return;
  }

  // clear old
  recordCumMs.length = 0;
  recordNames.length = 0;
  runHistory.length  = 0;
  userSegMs.length   = 0;

  // fetch new definitions
  const res  = await fetch(`data/splits/${file}?nocache=${Date.now()}`);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/).slice(1);
  let cum = 0;
  for (const line of lines) {
    const [name, raw] = line.split(',');
    const ms = Math.round(parseFloat(raw) * 1000);
    cum += ms;
    recordCumMs.push(cum);
    recordNames.push(name.trim());
  }

  // set max
  MAX_SPLITS = recordNames.length;

  // reset display + state
  elapsed       = 0;
  cumulativeMs  = 0;
  splitCount    = 0;
  rtaDisplay.textContent = formatTime(0);
  cumDisplay.textContent = formatTime(0);
  tableBody.innerHTML    = '';
  inputs.forEach(i => { i.value = ''; i.disabled = true; });

  // enable controls
  startStopBtn.disabled = false;
  resetBtn.disabled     = true;   // will enable once you actually start
  undoBtn.disabled      = true;
  exportBtn.disabled    = true;

  // lock selector
  comparisonSelect.disabled = true;
  loadComparisonBtn.disabled = true;
}

// ─── Timer Tick ───────────────────────────────────────────────────────────
function tick() {
  elapsed++;
  rtaDisplay.textContent = formatTime(elapsed);
}

// ─── Add a split ──────────────────────────────────────────────────────────
function addSplit() {
  const vals  = inputs.map(i => i.value);
  const segMs = parseSegmentMs(vals);

  // history for undo & export
  userSegMs.push(segMs);
  runHistory.push({
    name:      recordNames[splitCount],
    segmentMs: segMs,
    rtaSec:    elapsed
  });
  undoBtn.disabled   = false;
  exportBtn.disabled = false;

  // update totals
  cumulativeMs += segMs;
  splitCount++;

  const recMs = recordCumMs[splitCount - 1] || 0;
  const diffMs = cumulativeMs - recMs;
  const absSec = Math.floor(Math.abs(diffMs) / 1000);
  const m      = Math.floor(absSec / 60);
  const s      = absSec % 60;
  const diffStr = `${diffMs < 0 ? '-' : '+'}${m}:${s.toString().padStart(2, '0')}`;

  // render row
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${recordNames[splitCount - 1]}</td>
    <td>${formatMs(recMs)}</td>
    <td>${formatMs(cumulativeMs)}</td>
    <td>${formatSegMs(segMs)}</td>
    <td>${diffStr}</td>
  `;
  tableBody.insertBefore(row, tableBody.firstChild);

  cumDisplay.textContent = formatTime(Math.floor(cumulativeMs / 1000));
  inputs.forEach(i => i.value = '');
  inputs[0].focus();

  if (splitCount >= MAX_SPLITS) {
    clearInterval(timerInterval);
    timerInterval      = null;
    startStopBtn.textContent = 'Done';
    inputs.forEach(i => i.disabled = true);
  }
}

// ─── Undo last split ───────────────────────────────────────────────────────
function undoSplit() {
  if (runHistory.length === 0) return;

  runHistory.pop();
  const lastSegMs = userSegMs.pop();

  // remove table row
  const firstRow = tableBody.firstChild;
  if (firstRow) tableBody.removeChild(firstRow);

  // roll back totals
  cumulativeMs -= lastSegMs;
  splitCount--;

  cumDisplay.textContent = formatTime(Math.floor(cumulativeMs / 1000));
  inputs.forEach(i => i.value = '');
  inputs[0].focus();

  undoBtn.disabled   = runHistory.length === 0;
  exportBtn.disabled = runHistory.length === 0;

  // if timer is stopped but you still have room, re-enable inputs
  if (!timerInterval && splitCount < MAX_SPLITS) {
    startStopBtn.textContent = 'Stop';
    inputs.forEach(i => i.disabled = false);
  }
}

// ─── Export CSV ────────────────────────────────────────────────────────────
function exportCSV() {
  const lines = ['split,segment_time,rta_time'];
  for (const {name, segmentMs, rtaSec} of runHistory) {
    const segSec = (segmentMs / 1000).toFixed(3);
    const rtaStr = formatTime(rtaSec);
    const safeName = name.includes(',') ? `"${name}"` : name;
    lines.push(`${safeName},${segSec},${rtaStr}`);
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'my_splits_export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Start/Stop & Reset Handlers ──────────────────────────────────────────
function handleStartStop() {
  if (!timerInterval) {
    timerInterval = setInterval(tick, 1000);
    startStopBtn.textContent = 'Stop';
    inputs.forEach(i => i.disabled = false);
    inputs[0].focus();
    resetBtn.disabled = false;
  } else {
    clearInterval(timerInterval);
    timerInterval = null;
    startStopBtn.textContent = 'Start';
    inputs.forEach(i => i.disabled = true);
  }
}

function handleReset() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  elapsed       = 0;
  cumulativeMs  = 0;
  splitCount    = 0;
  MAX_SPLITS = recordNames.length;

  rtaDisplay.textContent = formatTime(0);
  cumDisplay.textContent = formatTime(0);
  tableBody.innerHTML    = '';

  inputs.forEach(i => { i.value = ''; i.disabled = true; });
  runHistory.length      = 0;
  userSegMs.length       = 0;

  startStopBtn.textContent = 'Start';
  startStopBtn.disabled    = false;
  resetBtn.disabled        = true;
  undoBtn.disabled         = true;
  exportBtn.disabled       = true;

  comparisonSelect.disabled = false;
  loadComparisonBtn.disabled = false;
}

// ─── Initialization ────────────────────────────────────────────────────────
async function init() {
  // grab elements
  comparisonSelect = document.getElementById('comparisonSelect');
  loadComparisonBtn = document.getElementById('loadComparison');
  rtaDisplay       = document.getElementById('rtatimer');
  cumDisplay       = document.getElementById('cumtimer');
  startStopBtn     = document.getElementById('startStop');
  resetBtn         = document.getElementById('reset');
  undoBtn          = document.getElementById('undo');
  exportBtn        = document.getElementById('export');
  tableBody        = document.querySelector('#splits tbody');
  inputs           = Array.from({ length: 6 }, (_, i) => document.getElementById(`d${i}`));

  // initial disable
  loadComparisonBtn.disabled = true;
  startStopBtn.disabled      = true;
  resetBtn.disabled          = true;
  undoBtn.disabled           = true;
  exportBtn.disabled         = true;
  inputs.forEach(i => i.disabled = true);

  await loadComparisonIndex();

  comparisonSelect.addEventListener('change', () => {
    loadComparisonBtn.disabled = !comparisonSelect.value;
  });
  loadComparisonBtn.addEventListener('click', loadSelectedComparison);

  startStopBtn.addEventListener('click', handleStartStop);
  resetBtn.addEventListener('click', handleReset);
  undoBtn.addEventListener('click', undoSplit);
  exportBtn.addEventListener('click', exportCSV);

  inputs.forEach((inp, idx) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
      if (inp.value && idx < inputs.length - 1) inputs[idx + 1].focus();
      if (inputs.every(i => i.value.length === 1)) addSplit();
    });
  });
}

window.addEventListener('DOMContentLoaded', init);
