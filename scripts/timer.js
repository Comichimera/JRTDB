// ─── Load & parse world-record splits from CSV ─────────────────────────────
const recordCumMs = [];
const recordNames   = [];

async function loadRecordSplits() {
  const res  = await fetch('data/splits.csv');
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/).slice(1);

  let cum = 0;
  for (const line of lines) {
    // split into [name, time]
    const [name, raw] = line.split(',');
    const ms = Math.round(parseFloat(raw) * 1000);

    cum += ms;
    recordCumMs.push(cum);
    recordNames.push(name.trim());
  }
}

(async function init() {
  await loadRecordSplits();

  // ─── Constants & State ────────────────────────────────────────────────────
  const MAX_SPLITS = recordNames.length;
  let elapsed     = 0;     // seconds for RTA timer
  let timerInterval = null;
  let splitCount  = 0;
  let cumulativeMs = 0;    // ms for IG timer

  const runHistory = [];
  
  const userSegMs      = [];      // history of entered segment durations
  const undoBtn        = document.getElementById('undo');
  undoBtn.disabled     = true;    // start disabled

  // ─── DOM References ───────────────────────────────────────────────────────
  const rtaDisplay   = document.getElementById('rtatimer');
  const cumDisplay   = document.getElementById('cumtimer');
  const startStopBtn = document.getElementById('startStop');
  const resetBtn     = document.getElementById('reset');
  const inputs       = Array.from({ length: 6 }, (_, i) => document.getElementById(`d${i}`));
  const tableBody    = document.querySelector('#splits tbody');

  // disable split inputs until timer starts
  inputs.forEach(i => i.disabled = true);

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

  function parseSegmentMs(vals) {
    const [mStr, s1, s2, ms1, ms2, ms3] = vals;
    const minutes = parseInt(mStr, 10) || 0;
    const seconds = parseInt(s1 + s2, 10) || 0;
    const millis  = parseInt(ms1 + ms2 + ms3, 10) || 0;
    return minutes * 60000 + seconds * 1000 + millis;
  }

  function formatSegMs(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000)
                  .toString()
                  .padStart(2, '0');
  const milli   = (ms % 1000)
                  .toString()
                  .padStart(3, '0');
  return `${minutes}:${seconds}.${milli}`;
}

  // ─── Timer Tick ───────────────────────────────────────────────────────────
  function tick() {
    elapsed++;
    rtaDisplay.textContent = formatTime(elapsed);
  }

  // ─── Split Creation ───────────────────────────────────────────────────────
  function addSplit() {
  const vals  = inputs.map(i => i.value);
  const segMs = parseSegmentMs(vals);

  userSegMs.push(segMs);
  undoBtn.disabled = false;

  cumulativeMs += segMs;
  splitCount++;

  const splitName = recordNames[splitCount - 1] || `Split ${splitCount}`;

  const recMs = recordCumMs[splitCount - 1] || 0;

  const diffMs = cumulativeMs - recMs;

  const absSec = Math.floor(Math.abs(diffMs) / 1000);
  const m      = Math.floor(absSec / 60);
  const s      = absSec % 60;
  const diffStr = `${diffMs < 0 ? '-' : '+'}${m}:${s.toString().padStart(2, '0')}`;

  runHistory.push({
    name:   splitName,
    segmentMs: segMs,
    rtaSec:    elapsed,            // elapsed is seconds since start
  });

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${splitName}</td>
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

function undoSplit() {
  if (userSegMs.length === 0) return;

  runHistory.pop();
  userSegMs.pop();

  // 1) remove the top row
  const firstRow = tableBody.firstChild;
  if (firstRow) tableBody.removeChild(firstRow);

  // 2) pull out the last segment ms
  const lastSegMs = userSegMs.pop();

  // 3) roll back your totals
  cumulativeMs -= lastSegMs;
  splitCount--;

  // 4) update displays
  cumDisplay.textContent = formatTime(Math.floor(cumulativeMs / 1000));

  // 5) clear+focus inputs
  inputs.forEach(i => i.value = '');
  inputs[0].focus();

  // 6) re-enable Undo only when there’s more history
  undoBtn.disabled = userSegMs.length === 0;

  // 7) if you’d previously hit MAX_SPLITS, re-open the inputs+Stop button
  if (!timerInterval && splitCount < MAX_SPLITS) {
    startStopBtn.textContent = 'Stop';
    inputs.forEach(i => i.disabled = false);
    }
  }

  function exportCSV() {
  // header
  const lines = ['split,segment_time,rta_time'];

  for (const {name, segmentMs, rtaSec} of runHistory) {
    // segment in seconds with three decimals:
    const segSec = (segmentMs / 1000).toFixed(3);
    // rta in H:MM:SS
    const rtaStr = formatTime(rtaSec);

    // escape commas in the split name if needed:
    const safeName = name.includes(',') ? `"${name}"` : name;

    lines.push(`${safeName},${segSec},${rtaStr}`);
  }

  const csvBlob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url     = URL.createObjectURL(csvBlob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = 'my_splits_export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

  // ─── Event Wiring ─────────────────────────────────────────────────────────
  startStopBtn.addEventListener('click', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      startStopBtn.textContent = 'Start';
      inputs.forEach(i => i.disabled = true);
    } else {
      timerInterval = setInterval(tick, 1000);
      startStopBtn.textContent = 'Stop';
      inputs.forEach(i => i.disabled = false);
      inputs[0].focus();
    }
  });

  resetBtn.addEventListener('click', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    elapsed     = 0;
    cumulativeMs = 0;
    splitCount  = 0;

    rtaDisplay.textContent  = formatTime(0);
    cumDisplay.textContent  = '0:00:00';
    startStopBtn.textContent = 'Start';
    tableBody.innerHTML      = '';
    inputs.forEach(i => {
      i.value    = '';
      i.disabled = true;

    userSegMs.length  = 0;
    runHistory.length = 0;
    undoBtn.disabled  = true;
    });
  });

  inputs.forEach((inp, idx) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
      if (inp.value && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
      if (inputs.every(i => i.value.length === 1)) {
        addSplit();
      }
    });
  });

  function updateExportButton() {
    exportBtn.disabled = runHistory.length === 0;
  }

  undoBtn.addEventListener('click', undoSplit);
  const exportBtn = document.getElementById('export');
  exportBtn.addEventListener('click', exportCSV);


})();
