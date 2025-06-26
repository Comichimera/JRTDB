// scripts/timer.js

// --- Timer start/stop code ---
let elapsed = 0;
let timerInterval = null;

const display = document.getElementById('timer');
const btn = document.getElementById('startStop');
const resetBtn = document.getElementById('reset');

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60)
              .toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function tick() {
  elapsed++;
  display.textContent = formatTime(elapsed);
}

if (btn) {
  btn.addEventListener('click', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      btn.textContent = 'Start';
    } else {
      timerInterval = setInterval(tick, 1000);
      btn.textContent = 'Stop';
    }
  });
}

// --- Split-input & table code ---
const inputs = Array.from({ length: 6 }, (_, i) =>
  document.getElementById(`d${i}`)
);
const tableBody = document.querySelector('#splits tbody');
let splitCount = 0;
let cumulativeMs = 0;

// parse the six digits into total milliseconds
function parseSegmentMs(vals) {
  const [m, s1, s2, ms1, ms2, ms3] = vals;
  const minutes = parseInt(m, 10) || 0;
  const seconds = parseInt(s1 + s2, 10) || 0;
  const millis = parseInt(ms1 + ms2 + ms3, 10) || 0;
  return minutes * 60000 + seconds * 1000 + millis;
}

// format milliseconds back to M:SS.xxx
function formatMs(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000)
                   .toString().padStart(2, '0');
  const millis = (ms % 1000).toString().padStart(3, '0');
  return `${minutes}:${seconds}.${millis}`;
}

// auto-advance, restrict to digits, and auto-submit when all filled
inputs.forEach((inp, idx) => {
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/, '').slice(0, 1);
    if (inp.value && idx < inputs.length - 1) {
      inputs[idx + 1].focus();
    }
    if (inputs.every(i => i.value.length === 1)) {
      addSplit();
    }
  });
});

function addSplit() {
  const vals = inputs.map(i => i.value);
  const segMs = parseSegmentMs(vals);
  cumulativeMs += segMs;
  splitCount++;

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>Split ${splitCount}</td>
    <td>${formatMs(cumulativeMs)}</td>
    <td>${formatMs(segMs)}</td>
  `;
  tableBody.insertBefore(row, tableBody.firstChild);

  // reset inputs & focus first
  inputs.forEach(i => i.value = '');
  inputs[0].focus();
}

resetBtn.addEventListener('click', () => {
  // stop timer if running
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  // reset timer display & button text
  elapsed = 0;
  display.textContent = formatTime(elapsed);
  btn.textContent = 'Start';

  // clear splits table & reset counters
  tableBody.innerHTML = '';
  splitCount = 0;
  cumulativeMs = 0;

  // clear & focus first input box
  inputs.forEach(i => i.value = '');
  inputs[0].focus();
});