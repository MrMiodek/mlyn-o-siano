/* ===== STATE ===== */
let G = null; // game state
let modalTeamId = null;

/* ===== API HELPERS ===== */
async function api(method, path, body) {
  const r = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) { alert(data.error || 'Błąd serwera'); return null; }
  return data;
}

/* ===== SCREEN MANAGEMENT ===== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
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
  for (const team of (state.teams || [])) {
    const isActive = team.id === state.activeTeamId;
    const bid = state.bids && state.bids[team.id] !== undefined ? state.bids[team.id] : null;
    const card = document.createElement('div');
    card.className = 'team-card' + (isActive ? ' active' : '');
    card.style.borderLeftColor = team.color;
    card.innerHTML = `
      <div class="team-name" style="color:${team.color}">${team.name}</div>
      <div class="team-stats">
        <div class="stat-chip" onclick="openModal(${team.id})" title="Kliknij by edytować">
          💰 <span class="stat-v">${team.credits}</span>
        </div>
        <div class="stat-chip" onclick="openModal(${team.id})" title="Kliknij by edytować">
          🎫 <span class="stat-v">${team.tokens}</span>
        </div>
      </div>
      ${bid !== null ? `<div class="team-bid">Licytacja: <span>${bid}</span></div>` : ''}
    `;
    list.appendChild(card);
  }
}

/* ===== INIT ===== */
async function initGame() {
  G = await api('POST', '/api/init');
  if (!G) return;
  renderSidebar(G);
  showScreen('draw');
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

/* ===== DRAW PHASE ===== */
async function drawCategory() {
  const resp = await api('POST', '/api/draw');
  if (!resp) return;

  const { category, pool } = resp;
  const spinner = document.getElementById('spinner-text');
  const btnDraw = document.getElementById('btn-draw');
  const btnConfirm = document.getElementById('btn-confirm-draw');

  btnDraw.disabled = true;
  btnConfirm.classList.add('hidden');
  spinner.classList.add('spinning');

  // Animate through categories
  let count = 0;
  const maxFrames = 20 + Math.floor(Math.random() * 10);
  const allCats = pool.length > 1 ? pool : [category];

  const interval = setInterval(() => {
    const display = allCats[count % allCats.length];
    spinner.textContent = display;
    count++;
    if (count >= maxFrames) {
      clearInterval(interval);
      spinner.textContent = category;
      spinner.classList.remove('spinning');
      btnConfirm.classList.remove('hidden');
      btnDraw.disabled = false;
      // Save to state (not a full state, just local)
      G.currentCategory = category;
    }
  }, 120);
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
      <button class="btn-vabank" onclick="vaBankTeam(${team.id}, ${team.credits})">Va Bank</button>
      <input class="bid-input" id="bid-input-${team.id}" type="number" min="0" max="${team.credits}"
        placeholder="0" oninput="onBidInput(${team.id})" />
      <div class="bid-credits">💰 ${team.credits}</div>
    `;
    rows.appendChild(row);
  }
  checkBidsReady();
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
  const allFilled = G.teams.every(t => {
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
  showScreen('question');
}

/* ===== QUESTION PHASE ===== */
function renderQuestionPhase(state) {
  const q = state.currentQuestion;
  document.getElementById('question-text').textContent = q.Pytanie;

  const hintBtn = document.getElementById('btn-hint');
  const correctBtn = document.getElementById('btn-correct');
  const abcdEl = document.getElementById('abcd-options');

  abcdEl.classList.add('hidden');
  abcdEl.innerHTML = '';

  if (q.Typ_pytania === 'ABCD') {
    hintBtn.textContent = '🅰️ ABCD (−1🎫,🪙×1)';
    hintBtn.classList.remove('hidden');
    hintBtn.disabled = state.abcdRevealed;

    correctBtn.onclick = null;

    if (state.abcdRevealed) {
      abcdEl.classList.remove('hidden');
      const options = buildAbcdOptions(q, state.abcdWrongOptions || []);
      for (const opt of options) {
        const btn = document.createElement('button');
        btn.className = 'btn-abcd-option' + (opt.wrong ? ' wrong' : '');
        btn.textContent = opt.label;
        if (!opt.wrong) {
          if (opt.correct) {
            btn.onclick = () => correctAnswer(false);
          } else {
            btn.onclick = () => wrongAbcd(opt.label);
          }
        }
        abcdEl.appendChild(btn);
      }
      correctBtn.textContent = '✓ Poprawna odpowiedź (🪙×1)';
      correctBtn.onclick = () => correctAnswer(false);
    } else {
      correctBtn.textContent = '✓ Poprawna odpowiedź (🪙×2)';
      correctBtn.onclick = () => correctAnswer(true);
    }
  } else {
    // Liczba
    hintBtn.textContent = state.marginUsed ? 'Margines+ (użyty)' : '📏 Margines+ (−1🎫,🪙×1)';
    hintBtn.disabled = state.marginUsed;
    hintBtn.classList.remove('hidden');

    if (state.marginUsed) {
      correctBtn.textContent = '✓ Poprawna odpowiedź (🪙×1)';
      correctBtn.onclick = () => correctAnswer(false);
    } else {
      correctBtn.textContent = '✓ Poprawna odpowiedź (🪙×2)';
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
  ].filter(o => o.label && o.label.trim());

  // Shuffle
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }

  return opts.map(o => ({ ...o, wrong: wrongOpts.includes(o.label) }));
}

async function useHint() {
  const q = G.currentQuestion;
  if (q.Typ_pytania === 'ABCD') {
    G = await api('POST', '/api/reveal-abcd');
  } else {
    G = await api('POST', '/api/use-margin');
  }
  if (!G) return;
  renderSidebar(G);
  renderQuestionPhase(G);
}

async function changeSub() {
  const active = G.teams.find(t => t.id === G.activeTeamId);
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

async function correctAnswer(double = true) {
  G = await api('POST', '/api/correct-answer', { double });
  if (!G) return;
  renderSidebar(G);
  renderSummary(G);
  showScreen('summary');
}

async function wrongAnswer() {
  G = await api('POST', '/api/wrong-answer');
  if (!G) return;
  renderSidebar(G);
  if (G.phase === 'summary') {
    renderSummary(G);
    showScreen('summary');
  } else {
    renderQuestionPhase(G);
  }
}

async function passQuestion() {
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

  if (!r) { el.innerHTML = ''; return; }

  if (r.type === 'correct') {
    const team = state.teams.find(t => t.id === r.teamId);
    el.innerHTML = `
      <span class="highlight">${team ? team.name : '?'}</span><br>
      zdobywa<br>
      <span class="pool-val">${r.pool}${r.double ? ' × 2 = ' + r.earned : ''}</span><br>
      kredytów!
    `;
  } else {
    el.innerHTML = `W puli pozostaje<br><span class="pool-val">${r.pool}</span><br>kredytów`;
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
    document.getElementById('spinner-text').textContent = '?';
    document.getElementById('btn-confirm-draw').classList.add('hidden');
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
    row.innerHTML = `
      <div class="final-rank">${i + 1}.</div>
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
  const team = G.teams.find(t => t.id === teamId);
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
  switch (state.phase) {
    case 'draw':
      document.getElementById('spinner-text').textContent = '?';
      document.getElementById('btn-confirm-draw').classList.add('hidden');
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
  } else {
    showScreen('init');
  }
});