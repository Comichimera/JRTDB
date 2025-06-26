// ─── Load & parse world-record splits from CSV ─────────────────────────────
const recordCumMs = [];

async function loadRecordSplits() {
  const res  = await fetch('data/splits.csv');
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/).slice(1);

  let cum = 0;
  for (const line of lines) {
    const [, segStr] = line.split(',');
    const ms = Math.round(parseFloat(segStr) * 1000);
    cum += ms;
    recordCumMs.push(cum);
  }
}

(async function init() {
  await loadRecordSplits();

  // ─── Constants & State ────────────────────────────────────────────────────
  const MAX_SPLITS = 36;
  let elapsed     = 0;     // seconds for RTA timer
  let timerInterval = null;
  let splitCount  = 0;
  let cumulativeMs = 0;    // ms for IG timer

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

  // ─── Timer Tick ───────────────────────────────────────────────────────────
  function tick() {
    elapsed++;
    rtaDisplay.textContent = formatTime(elapsed);
  }

  // ─── Split Creation ───────────────────────────────────────────────────────
  function addSplit() {
    const vals  = inputs.map(i => i.value);
    const segMs = parseSegmentMs(vals);
    cumulativeMs += segMs;
    splitCount++;

    // record cumulative for this split
    const recMs = recordCumMs[splitCount - 1] || 0;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>Split ${splitCount}</td>
      <td>${formatMs(recMs)}</td>
      <td>${formatMs(cumulativeMs)}</td>
      <td>${formatMs(segMs)}</td>
    `;
    tableBody.insertBefore(row, tableBody.firstChild);

    cumDisplay.textContent = formatMs(cumulativeMs);

    inputs.forEach(i => i.value = '');
    inputs[0].focus();

    if (splitCount >= MAX_SPLITS) {
      clearInterval(timerInterval);
      timerInterval = null;
      startStopBtn.textContent = 'Done';
      inputs.forEach(i => i.disabled = true);
    }
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
    cumDisplay.textContent  = '0:00:00.000';
    startStopBtn.textContent = 'Start';
    tableBody.innerHTML      = '';
    inputs.forEach(i => {
      i.value    = '';
      i.disabled = true;
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

})();
