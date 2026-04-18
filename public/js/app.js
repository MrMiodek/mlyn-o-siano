/* ===== STATE ===== */
let G = null; // game state
let modalTeamId = null;
let _lastActionTime = 0;
function guardAction() {
  const now = Date.now();
  if (now - _lastActionTime < 500) return false;
  _lastActionTime = now;
  return true;
}

/* ===== WHEEL AUDIO ===== */
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playWheelTick(radPerSec) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'triangle';
  osc.frequency.value = 900;
  const vol = Math.min(0.35, 0.08 + radPerSec * 0.008);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.035);
}

function playWheelStop() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(280, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.18);
  gain.gain.setValueAtTime(0.45, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.22);
}

/* ===== WHEEL STATE ===== */
const WHEEL_COLORS = [
  '#c0392b',
  '#2980b9',
  '#27ae60',
  '#f39c12',
  '#8e44ad',
  '#16a085',
  '#d35400',
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#e67e22',
  '#9b59b6',
  '#1abc9c',
  '#34495e',
  '#d4ac0d',
];
let wheelAngle = 0;
let wheelAnimId = null;
let wheelCategories = [];

/* ===== API HELPERS ===== */
async function api(method, path, body) {
  const r = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) {
    alert(data.error || 'Błąd serwera');
    return null;
  }
  if (method === 'POST') updateUndoRedoButtons();
  return data;
}

async function updateUndoRedoButtons() {
  try {
    const r = await fetch('/api/history-info');
    const info = await r.json();
    document.getElementById('btn-undo').disabled = !info.canUndo;
    document.getElementById('btn-redo').disabled = !info.canRedo;
  } catch (_) {}
}

/* ===== SCREEN MANAGEMENT ===== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

/* ===== SIDEBAR RENDER ===== */
function renderSidebar(state) {
  if (!state) return;

  document.getElementById('round-display').textContent = state.round || 1;
  document.getElementById('question-display').textContent = state.questionInRound || 1;

  const catEl = document.getElementById('category-display');
  catEl.textContent = state.currentCategory || '—';

  document.getElementById('sidebar-subcategory').textContent = state.currentSubcategory || '—';
  document.getElementById('sidebar-pool').textContent = '🪙 ' + (state.currentPool || 0);

  const list = document.getElementById('teams-list');
  list.innerHTML = '';
  const sortByBid = (state.phase === 'question' || state.phase === 'subcategory' || state.phase === 'summary') && state.bids;
  const sortedTeams = [...(state.teams || [])].sort((a, b) => {
    if (sortByBid) {
      const bidA = state.bids[a.id] ?? -Infinity;
      const bidB = state.bids[b.id] ?? -Infinity;
      return bidB - bidA;
    }
    return b.credits - a.credits;
  });
  for (const team of sortedTeams) {
    const isActive = team.id === state.activeTeamId;
    const bid = state.bids && state.bids[team.id] !== undefined ? state.bids[team.id] : null;
    const card = document.createElement('div');
    card.className = 'team-card' + (isActive ? ' active' : '');
    card.style.borderLeftColor = team.color;
    card.style.setProperty('--team-color', team.color);
    card.innerHTML = `
      <div class="team-header">
        <div class="team-name" style="color:${team.color}">${team.name}</div>
        ${bid !== null ? `<div class="team-bid-inline">(🪙 <span>${bid}</span>)</div>` : ''}
      </div>
      <div class="team-stats">
        <div class="stat-chip" onclick="openModal(${team.id})" title="Kliknij by edytować">
          💰 <span class="stat-v">${team.credits}</span>
        </div>
        <div class="stat-chip" onclick="openModal(${team.id})" title="Kliknij by edytować">
          🎫 <span class="stat-v">${team.tokens}</span>
        </div>
      </div>
    `;
    list.appendChild(card);
  }
}

/* ===== INIT ===== */
async function initGame() {
  G = await api('POST', '/api/init');
  if (!G) return;
  renderSidebar(G);
  wheelAngle = 0;
  initWheelDisplay();
  showScreen('draw');
}

/* ===== RESET ===== */
function resetGame() {
  if (!confirm('Na pewno zresetować grę?')) return;
  G = null;
  document.getElementById('round-display').textContent = '1';
  document.getElementById('question-display').textContent = '1';
  document.getElementById('category-display').textContent = '—';
  document.getElementById('sidebar-subcategory').textContent = '—';
  document.getElementById('sidebar-pool').textContent = '🪙 0';
  document.getElementById('teams-list').innerHTML = '';
  document.getElementById('btn-undo').disabled = true;
  document.getElementById('btn-redo').disabled = true;
  showScreen('init');
}

/* ===== UNDO ===== */
async function undo() {
  const prev = await api('POST', '/api/undo');
  if (!prev) return;
  G = prev;
  renderSidebar(G);
  // Restore screen based on phase
  applyPhase(G);
}

/* ===== REDO ===== */
async function redo() {
  const next = await api('POST', '/api/redo');
  if (!next) return;
  G = next;
  renderSidebar(G);
  applyPhase(G);
}

/* ===== FORTUNE WHEEL ===== */
function getWheelCategories() {
  if (!G) return [];
  if (G.categoryPool && G.categoryPool.length > 0) return G.categoryPool;
  if (G.usedCategories && G.usedCategories.length > 0) return G.usedCategories;
  return [];
}

function drawWheel(categories, rotation) {
  const canvas = document.getElementById('wheel-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssSize = 620;
  if (canvas.width !== cssSize * dpr) {
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const size = cssSize;
  const cx = size / 2;
  const cy = size / 2;
  const radius = cx - 8;
  const n = categories.length;

  ctx.clearRect(0, 0, size, size);
  if (n === 0) return;

  const sliceAngle = (2 * Math.PI) / n;

  // Outer ring glow
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(245, 200, 66, 0.25)';
  ctx.lineWidth = 3;
  ctx.stroke();

  for (let i = 0; i < n; i++) {
    const startA = rotation + i * sliceAngle;
    const endA = startA + sliceAngle;

    // Slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startA, endA);
    ctx.closePath();
    ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text along the slice
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startA + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const fontRem = n > 12 ? 1.2 : n > 8 ? 1.5 : n > 5 ? 1.8 : 2.1;
    const fontSize = fontRem * rem;
    ctx.font = `bold ${fontSize}px "Barlow Condensed", sans-serif`;

    const maxWidth = radius - 20;
    let text = categories[i];
    while (ctx.measureText(text).width > maxWidth && text.length > 3) {
      text = text.slice(0, -1);
    }
    if (text !== categories[i]) text += '…';
    ctx.fillText(text, radius - 14, fontSize / 3);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Center hub
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
  ctx.fillStyle = '#1e1e2e';
  ctx.fill();
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
  ctx.fillStyle = '#f5c842';
  ctx.fill();
}

function initWheelDisplay() {
  wheelCategories = getWheelCategories();
  drawWheel(wheelCategories, wheelAngle);
}

function spinToCategory(targetCategory, pool) {
  wheelCategories = pool;
  const n = pool.length;
  const sliceAngle = (2 * Math.PI) / n;
  const targetIndex = pool.indexOf(targetCategory);
  if (targetIndex === -1) return;

  // Pointer is at -PI/2 (top of canvas).
  // For the center of segment targetIndex to align with the pointer:
  const baseTarget = -Math.PI / 2 - targetIndex * sliceAngle - sliceAngle / 2;

  // Random offset within 60% of the slice so it doesn't always hit dead center
  const jitter = (Math.random() - 0.5) * sliceAngle * 0.6;
  let finalAngle = baseTarget + jitter;

  // Ensure the wheel spins forward (clockwise) with 4-6 extra full rotations
  const extraRotations = (4 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
  while (finalAngle < wheelAngle + 2 * Math.PI) finalAngle += 2 * Math.PI;
  finalAngle += extraRotations;

  const startAngle = wheelAngle;
  const totalDelta = finalAngle - startAngle;
  const duration = 4000 + Math.random() * 1500;
  const startTime = performance.now();

  if (wheelAnimId) cancelAnimationFrame(wheelAnimId);

  let lastTickCount = Math.floor(wheelAngle / sliceAngle);

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    // Cubic ease-out for natural deceleration
    const eased = 1 - Math.pow(1 - t, 3);

    wheelAngle = startAngle + totalDelta * eased;
    drawWheel(pool, wheelAngle);

    const currentTickCount = Math.floor(wheelAngle / sliceAngle);
    if (currentTickCount !== lastTickCount) {
      const radPerSec = (3 * Math.pow(1 - t, 2) * totalDelta) / (duration / 1000);
      playWheelTick(radPerSec);
      lastTickCount = currentTickCount;
    }

    if (t < 1) {
      wheelAnimId = requestAnimationFrame(animate);
    } else {
      wheelAngle = finalAngle;
      drawWheel(pool, wheelAngle);
      wheelAnimId = null;
      playWheelStop();
      onWheelStopped(targetCategory);
    }
  }

  wheelAnimId = requestAnimationFrame(animate);
}

function onWheelStopped(category) {
  document.getElementById('btn-draw').disabled = false;
  document.getElementById('btn-confirm-draw').classList.remove('hidden');
  const resultEl = document.getElementById('wheel-result');
  resultEl.textContent = category;
  resultEl.classList.remove('hidden');
  G.currentCategory = category;
}

/* ===== DRAW PHASE ===== */
async function drawCategory() {
  const btnDraw = document.getElementById('btn-draw');
  const btnConfirm = document.getElementById('btn-confirm-draw');
  const resultEl = document.getElementById('wheel-result');

  btnDraw.disabled = true;
  btnConfirm.classList.add('hidden');
  resultEl.classList.add('hidden');

  const resp = await api('POST', '/api/draw');
  if (!resp) {
    btnDraw.disabled = false;
    return;
  }

  const { category, pool } = resp;
  spinToCategory(category, pool);
}

async function confirmDraw() {
  G = await api('POST', '/api/confirm-draw');
  if (!G) return;
  renderSidebar(G);
  renderBidPhase(G);
  showScreen('bid');
}

/* ===== BID PHASE ===== */
function renderBidPhase(state) {
  const rows = document.getElementById('bid-rows');
  rows.innerHTML = '';

  for (const team of state.teams) {
    const row = document.createElement('div');
    row.className = 'bid-row';
    row.dataset.teamId = team.id;
    row.innerHTML = `
      <div class="bid-team-name" style="color:${team.color}">${team.name}</div>
      <button class="btn-bid-step" onclick="stepBid(${team.id}, -${state.config.bidStep}, ${team.credits})">−${state.config.bidStep}</button>
      <input class="bid-input" id="bid-input-${team.id}" type="number" min="0" max="${team.credits}"
        placeholder="0" oninput="onBidInput(${team.id})" />
      <button class="btn-bid-step" onclick="stepBid(${team.id}, ${state.config.bidStep}, ${team.credits})">+${state.config.bidStep}</button>
      <button class="btn-vabank" onclick="vaBankTeam(${team.id}, ${team.credits})">Va Bank</button>
      <div class="bid-credits">💰 ${team.credits}</div>
    `;
    rows.appendChild(row);
  }
  checkBidsReady();
}

function stepBid(teamId, delta, maxCredits) {
  const inp = document.getElementById('bid-input-' + teamId);
  inp.value = Math.max(0, Math.min(maxCredits, (parseInt(inp.value) || 0) + delta));
  onBidInput(teamId);
}

function vaBankTeam(teamId, credits) {
  const inp = document.getElementById('bid-input-' + teamId);
  inp.value = credits;
  onBidInput(teamId);
}

function onBidInput(teamId) {
  const inp = document.getElementById('bid-input-' + teamId);
  inp.classList.toggle('filled', inp.value !== '');
  checkBidsReady();
}

function checkBidsReady() {
  const btn = document.getElementById('btn-confirm-bids');
  const allFilled = G.teams.every((t) => {
    const inp = document.getElementById('bid-input-' + t.id);
    return inp && inp.value !== '';
  });
  btn.disabled = !allFilled;
}

async function confirmBids() {
  const bids = {};
  for (const t of G.teams) {
    const inp = document.getElementById('bid-input-' + t.id);
    bids[t.id] = parseInt(inp.value) || 0;
  }
  G = await api('POST', '/api/submit-bids', { bids });
  if (!G) return;
  renderSidebar(G);
  await renderSubcategoryPhase();
  showScreen('subcategory');
}

/* ===== SUBCATEGORY PHASE ===== */
async function renderSubcategoryPhase() {
  const subs = await api('GET', '/api/subcategories');
  const container = document.getElementById('subcategory-buttons');
  container.innerHTML = '';
  for (const sub of subs) {
    const btn = document.createElement('button');
    btn.className = 'btn-subcategory';
    btn.textContent = sub;
    btn.onclick = () => selectSubcategory(sub);
    container.appendChild(btn);
  }
}

async function selectSubcategory(sub) {
  G = await api('POST', '/api/select-subcategory', { subcategory: sub });
  if (!G) return;
  renderSidebar(G);
  renderQuestionPhase(G);
  updateChangeSubBtn();
  showScreen('question');
}

async function updateChangeSubBtn() {
  const subs = await api('GET', '/api/subcategories');
  document.getElementById('btn-change-sub').disabled = !subs || subs.length === 0;
}

/* ===== MEDIA HELPERS ===== */
function openMediaPopup(url) {
  const w = 640, h = 400;
  const left = Math.round(screen.width / 2 - w / 2);
  const top = Math.round(screen.height / 2 - h / 2);
  window.open(url, 'media_popup', `width=${w},height=${h},left=${left},top=${top},resizable=yes`);
}

function renderLinkedText(text) {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safe = url.replace(/"/g, '%22');
    return `<a href="${safe}" target="_blank" onclick="event.preventDefault();openMediaPopup('${safe}')" class="media-link">${label}</a>`;
  });
}

/* ===== QUESTION PHASE ===== */
function renderQuestionPhase(state) {
  const q = state.currentQuestion;
  document.getElementById('question-text').innerHTML = renderLinkedText(q.Pytanie);

  const marginEl = document.getElementById('question-margin');
  if (q.Typ_pytania !== 'ABCD') {
    const margin = state.effectiveMargin !== null && state.effectiveMargin !== undefined ? state.effectiveMargin : Number(q.Margines ?? 0);
    marginEl.textContent = `(Margines: ${margin})`;
    marginEl.classList.remove('hidden');
  } else {
    marginEl.classList.add('hidden');
  }

  const hintBtn = document.getElementById('btn-hint');
  const correctBtn = document.getElementById('btn-correct');
  const abcdEl = document.getElementById('abcd-options');

  abcdEl.classList.add('hidden');
  abcdEl.innerHTML = '';

  if (q.Typ_pytania === 'ABCD') {
    hintBtn.innerHTML = '🅰️ ABCD <span class="btn-sub">(−1🎫)</span>';
    hintBtn.classList.remove('hidden');
    hintBtn.disabled = state.abcdRevealed;

    correctBtn.onclick = null;

    if (state.abcdRevealed) {
      abcdEl.classList.remove('hidden');
      const options = buildAbcdOptions(q, state.abcdWrongOptions || []);
      const letters = ['A', 'B', 'C', 'D'];
      for (const [i, opt] of options.entries()) {
        const btn = document.createElement('button');
        btn.className = 'btn-abcd-option' + (opt.wrong ? ' wrong' : '');
        btn.innerHTML = `<span class="abcd-letter">${letters[i]}</span>${opt.label}`;
        if (!opt.wrong) {
          if (opt.correct) {
            btn.onclick = () => correctAnswer(false);
          } else {
            btn.onclick = () => wrongAbcd(opt.label);
          }
        }
        abcdEl.appendChild(btn);
      }
      correctBtn.textContent = '✓ Poprawna odpowiedź';
      correctBtn.onclick = () => correctAnswer(false);
    } else {
      correctBtn.innerHTML = '✓ Poprawna odpowiedź <span class="btn-sub">(+1🎫)</span>';
      correctBtn.onclick = () => correctAnswer(true);
    }
  } else {
    // Liczba
    hintBtn.innerHTML = state.marginUsed
      ? 'Margines+ <span class="btn-sub">(użyty)</span>'
      : '📏 Margines+ <span class="btn-sub">(−1🎫)</span>';
    hintBtn.disabled = state.marginUsed;
    hintBtn.classList.remove('hidden');

    if (state.marginUsed) {
      correctBtn.textContent = '✓ Poprawna odpowiedź';
      correctBtn.onclick = () => correctAnswer(false);
    } else {
      correctBtn.innerHTML = '✓ Poprawna odpowiedź <span class="btn-sub">(+1🎫)</span>';
      correctBtn.onclick = () => correctAnswer(true);
    }
  }
}

function buildAbcdOptions(q, wrongOpts) {
  const opts = [
    { label: q.Podpucha1, correct: false },
    { label: q.Podpucha2, correct: false },
    { label: q.Podpucha3, correct: false },
    { label: q.Akceptowana_Odpowiedź, correct: true },
  ].filter((o) => o.label && o.label.trim());

  // Shuffle
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }

  return opts.map((o) => ({ ...o, wrong: wrongOpts.includes(o.label) }));
}

async function useHint() {
  if (!guardAction()) return;
  const active = G.teams.find((t) => t.id === G.activeTeamId);
  if (active && active.tokens <= 0) {
    alert('Brak tokenów!');
    return;
  }
  const q = G.currentQuestion;
  if (q.Typ_pytania === 'ABCD') {
    G = await api('POST', '/api/reveal-abcd');
  } else {
    G = await api('POST', '/api/use-margin');
  }
  if (!G) return;
  renderSidebar(G);
  renderQuestionPhase(G);
  updateChangeSubBtn();
}

async function changeSub() {
  if (!guardAction()) return;
  const active = G.teams.find((t) => t.id === G.activeTeamId);
  if (active && active.tokens <= 0) {
    alert('Brak tokenów!');
    return;
  }
  G = await api('POST', '/api/change-subcategory');
  if (!G) return;
  renderSidebar(G);
  await renderSubcategoryPhase();
  showScreen('subcategory');
}

async function correctAnswer(longshot = true) {
  if (!guardAction()) return;
  G = await api('POST', '/api/correct-answer', { longshot });
  if (!G) return;
  renderSidebar(G);
  renderSummary(G);
  showScreen('summary');
}

async function wrongAnswer() {
  if (!guardAction()) return;
  G = await api('POST', '/api/wrong-answer');
  if (!G) return;
  renderSidebar(G);
  if (G.phase === 'summary') {
    renderSummary(G);
    showScreen('summary');
  } else {
    renderQuestionPhase(G);
    updateChangeSubBtn();
  }
}

async function passQuestion() {
  if (!guardAction()) return;
  G = await api('POST', '/api/pass-question');
  if (!G) return;
  renderSidebar(G);
  if (G.phase === 'summary') {
    renderSummary(G);
    showScreen('summary');
  } else {
    renderQuestionPhase(G);
  }
}

async function wrongAbcd(label) {
  if (!guardAction()) return;
  G = await api('POST', '/api/wrong-abcd', { option: label });
  if (!G) return;
  renderSidebar(G);
  if (G.phase === 'summary') {
    renderSummary(G);
    showScreen('summary');
  } else {
    renderQuestionPhase(G);
  }
}

/* ===== SUMMARY PHASE ===== */
function renderSummary(state) {
  const el = document.getElementById('summary-text');
  const r = state.questionResult;

  if (!r) {
    el.innerHTML = '';
    return;
  }

  const mediaUrl = state.currentQuestion?.Media;
  const mediaLink = mediaUrl
    ? `<br><br><a href="${mediaUrl}" target="_blank" onclick="event.preventDefault();openMediaPopup('${mediaUrl}')" class="media-link">▶ Odtwórz materiał</a>`
    : '';

  if (r.type === 'correct') {
    const team = state.teams.find((t) => t.id === r.teamId);
    el.innerHTML = `
      <span class="highlight" style="color:${team ? team.color : 'inherit'}">${team ? team.name : '?'}</span><br>
      zdobywają<br>
      🪙 <span class="pool-val">${r.pool}</span>${r.longshot ? ' +1🎫' : ''}!${mediaLink}
    `;
  } else {
    el.innerHTML = `W puli pozostaje<br>🪙 <span class="pool-val">${r.pool}</span>${mediaLink}`;
  }
}

async function confirmSummary() {
  G = await api('POST', '/api/confirm-summary');
  if (!G) return;
  renderSidebar(G);
  if (G.phase === 'gameover') {
    renderGameOver(G);
    showScreen('gameover');
  } else {
    // Reset draw screen
    document.getElementById('btn-confirm-draw').classList.add('hidden');
    document.getElementById('wheel-result').classList.add('hidden');
    initWheelDisplay();
    showScreen('draw');
  }
}

/* ===== GAME OVER ===== */
function renderGameOver(state) {
  document.getElementById('sidebar').style.display = 'none';
  const sorted = [...state.teams].sort((a, b) => b.credits - a.credits);
  const table = document.getElementById('final-table');
  table.innerHTML = '';
  sorted.forEach((team, i) => {
    const row = document.createElement('div');
    row.className = 'final-row';
    if (i === 0) {
      row.style.borderColor = team.color;
      row.style.background = `${team.color}0f`;
    }
    row.innerHTML = `
      <div class="final-rank" style="${i === 0 ? `color:${team.color}` : ''}">${i + 1}.</div>
      <div class="final-team-name" style="color:${team.color}">${team.name}</div>
      <div class="final-credits">💰 ${team.credits}</div>
      <div class="final-tokens">🎫 ${team.tokens}</div>
    `;
    table.appendChild(row);
  });
}

/* ===== MODAL ===== */
function openModal(teamId) {
  modalTeamId = teamId;
  const team = G.teams.find((t) => t.id === teamId);
  document.getElementById('modal-team-name').textContent = team.name;
  document.getElementById('modal-credits').value = team.credits;
  document.getElementById('modal-tokens').value = team.tokens;
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  modalTeamId = null;
}

async function saveModal() {
  const credits = parseInt(document.getElementById('modal-credits').value);
  const tokens = parseInt(document.getElementById('modal-tokens').value);
  G = await api('POST', '/api/update-team', { teamId: modalTeamId, credits, tokens });
  if (!G) return;
  renderSidebar(G);
  closeModal();
}

/* ===== PHASE ROUTER (for undo) ===== */
function applyPhase(state) {
  const sidebar = document.getElementById('sidebar');
  sidebar.style.display = state.phase === 'gameover' ? 'none' : '';
  switch (state.phase) {
    case 'draw':
      document.getElementById('btn-confirm-draw').classList.add('hidden');
      document.getElementById('wheel-result').classList.add('hidden');
      initWheelDisplay();
      showScreen('draw');
      break;
    case 'bid':
      renderBidPhase(state);
      showScreen('bid');
      break;
    case 'subcategory':
      renderSubcategoryPhase().then(() => showScreen('subcategory'));
      break;
    case 'question':
      renderQuestionPhase(state);
      updateChangeSubBtn();
      showScreen('question');
      break;
    case 'summary':
      renderSummary(state);
      showScreen('summary');
      break;
    case 'gameover':
      renderGameOver(state);
      showScreen('gameover');
      break;
    default:
      showScreen('init');
  }
}

/* ===== INIT ON LOAD ===== */
window.addEventListener('DOMContentLoaded', async () => {
  // Try to restore existing game
  const state = await api('GET', '/api/state');
  if (state && state.initialized) {
    G = state;
    renderSidebar(G);
    applyPhase(G);
    updateUndoRedoButtons();
  } else {
    showScreen('init');
  }
});
