const rtaDisplay = document.getElementById('rtatimer');
const cumDisplay = document.getElementById('cumtimer');
const startStopBtn = document.getElementById('startStop');
const resetBtn = document.getElementById('reset');
const inputs = Array.from({ length: 6 }, (_, i) => document.getElementById(`d${i}`));
const tableBody = document.querySelector('#splits tbody');

// State
let elapsed = 0;         // elapsed seconds for RTA timer
let timerInterval = null;
let splitCount = 0;
let cumulativeMs = 0;    // cumulative time in milliseconds

// Disable split inputs until timer is running
inputs.forEach(i => i.disabled = true);


// ─── Formatting Helpers ──────────────────────────────────────────────────────

/**
 * Format a whole-second count as H:MM:SS
 */
function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Format a millisecond count as H:MM:SS.xxx
 */
function formatMs(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  const milli = (ms % 1000).toString().padStart(3, '0');
  return `${h}:${m}:${s}.${milli}`;
}

/**
 * Parse the six single-digit inputs [M,S,S,m,m,m] into total milliseconds
 */
function parseSegmentMs(vals) {
  const [mStr, s1, s2, ms1, ms2, ms3] = vals;
  const minutes = parseInt(mStr, 10) || 0;
  const seconds = parseInt(s1 + s2, 10) || 0;
  const millis = parseInt(ms1 + ms2 + ms3, 10) || 0;
  return minutes * 60000 + seconds * 1000 + millis;
}


// ─── Timer Tick ─────────────────────────────────────────────────────────────

function tick() {
  elapsed++;
  rtaDisplay.textContent = formatTime(elapsed);
}


// ─── Split Submission ──────────────────────────────────────────────────────

function addSplit() {
  const vals = inputs.map(i => i.value);
  const segMs = parseSegmentMs(vals);
  cumulativeMs += segMs;
  splitCount++;

  // Update cumulative display
  cumDisplay.textContent = formatMs(cumulativeMs);

  // Build new row
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>Split ${splitCount}</td>
    <td>${formatMs(cumulativeMs)}</td>
    <td>${formatMs(segMs)}</td>
  `;
  // Insert at top so splits fill upwards
  tableBody.insertBefore(row, tableBody.firstChild);

  // Clear inputs and refocus first
  inputs.forEach(i => i.value = '');
  inputs[0].focus();
}


// ─── Event Wiring ──────────────────────────────────────────────────────────

// Start/Stop toggle
startStopBtn.addEventListener('click', () => {
  if (timerInterval) {
    // Stop
    clearInterval(timerInterval);
    timerInterval = null;
    startStopBtn.textContent = 'Start';
    inputs.forEach(i => i.disabled = true);
  } else {
    // Start
    timerInterval = setInterval(tick, 1000);
    startStopBtn.textContent = 'Stop';
    inputs.forEach(i => i.disabled = false);
    inputs[0].focus();
  }
});

// Reset everything
resetBtn.addEventListener('click', () => {
  // Stop timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  // Reset state
  elapsed = 0;
  cumulativeMs = 0;
  splitCount = 0;
  // Reset displays
  rtaDisplay.textContent = formatTime(0);
  cumDisplay.textContent = '0:00:00.000';
  startStopBtn.textContent = 'Start';
  // Clear splits
  tableBody.innerHTML = '';
  // Clear & disable inputs
  inputs.forEach(i => {
    i.value = '';
    i.disabled = true;
  });
});

// Auto-advance & auto-submit on digit entry
inputs.forEach((inp, idx) => {
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g, '').slice(0,1);
    if (inp.value && idx < inputs.length - 1) {
      inputs[idx + 1].focus();
    }
    if (inputs.every(i => i.value.length === 1)) {
      addSplit();
    }
  });
});