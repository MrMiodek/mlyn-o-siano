const express = require('express');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const app = express();
app.use(express.json());

// Resolve paths relative to this file, not process.cwd()
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');

app.use(express.static(PUBLIC));

// Explicit fallback so / always serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

const CONFIG_PATH = path.join(ROOT, 'config.json');
const STATE_PATH = path.join(ROOT, 'data', 'game_state.json');
const HISTORY_PATH = path.join(ROOT, 'data', 'game_history.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function loadQuestions() {
  const config = loadConfig();
  const csvPath = path.join(__dirname, config.questionsFile.replace('./', ''));
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  });
  return records;
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return null;
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function pushHistory(state) {
  const history = loadHistory();
  history.push(JSON.parse(JSON.stringify(state)));
  if (history.length > 50) history.shift();
  saveHistory(history);
}

// GET config
app.get('/api/config', (req, res) => {
  res.json(loadConfig());
});

// GET questions grouped by category
app.get('/api/questions', (req, res) => {
  const questions = loadQuestions();
  const grouped = {};
  for (const q of questions) {
    if (!grouped[q.Kategoria]) grouped[q.Kategoria] = [];
    grouped[q.Kategoria].push(q);
  }
  res.json(grouped);
});

// GET state
app.get('/api/state', (req, res) => {
  const state = loadState();
  if (!state) return res.json({ initialized: false });
  res.json(state);
});

// POST init game
app.post('/api/init', (req, res) => {
  const config = loadConfig();
  const questions = loadQuestions();

  // Build category pool
  const grouped = {};
  for (const q of questions) {
    if (!grouped[q.Kategoria]) grouped[q.Kategoria] = [];
    grouped[q.Kategoria].push(q);
  }
  const allCategories = Object.keys(grouped);

  const teams = config.teamNames.slice(0, config.teams).map((name, i) => ({
    id: i,
    name,
    color: config.teamColors[i],
    credits: config.startingCredits,
    tokens: config.startingTokens,
  }));

  const state = {
    initialized: true,
    phase: 'draw', // draw, bid, subcategory, question, summary, gameover
    round: 1,
    questionInRound: 1,
    totalQuestions: 0,
    currentCategory: null,
    currentSubcategory: null,
    currentQuestion: null,
    currentPool: 0,
    teams,
    activeTeamId: null,
    bids: {}, // teamId -> amount
    categoryPool: [...allCategories],
    usedCategories: [],
    questionResult: null, // { type: 'correct'|'passed', teamId, pool, longshot }
    usedQuestionKeys: [], // "Category|Subcategory" used
    abcdRevealed: false,
    abcdWrongOptions: [],
    marginUsed: false,
    config,
  };

  saveState(state);
  // Clear history
  saveHistory([]);
  res.json(state);
});

// POST undo
app.post('/api/undo', (req, res) => {
  const history = loadHistory();
  if (history.length === 0) return res.status(400).json({ error: 'Brak historii do cofnięcia' });
  const prev = history.pop();
  saveHistory(history);
  saveState(prev);
  res.json(prev);
});

// POST draw category (random)
app.post('/api/draw', (req, res) => {
  const state = loadState();
  pushHistory(state);

  if (state.categoryPool.length === 0) {
    // replenish from used
    state.categoryPool = [...state.usedCategories];
    state.usedCategories = [];
  }

  const pool = state.categoryPool;

  // Pick random
  const idx = Math.floor(Math.random() * pool.length);
  const cat = pool[idx];
  state.currentCategory = cat;
  saveState(state);

  res.json({ category: cat, pool });
});

// POST confirm draw -> go to bid phase
app.post('/api/confirm-draw', (req, res) => {
  const state = loadState();
  pushHistory(state);
  const config = state.config;

  state.phase = 'bid';
  state.bids = {};
  const taxRate = config.baseTax[state.round - 1] / 100;
  let taxCollected = 0;
  state.teams.forEach((team) => {
    const tax = Math.floor(team.credits * taxRate);
    team.credits -= tax;
    taxCollected += tax;
  });
  state.currentPool = (state.currentPool || 0) + taxCollected;

  // Remove from category pool
  state.categoryPool = state.categoryPool.filter((c) => c !== state.currentCategory);

  saveState(state);
  res.json(state);
});

// POST submit bids
app.post('/api/submit-bids', (req, res) => {
  const state = loadState();
  pushHistory(state);

  const { bids } = req.body; // { teamId: amount }
  state.bids = bids;

  // Subtract bids from teams
  for (const [teamId, amount] of Object.entries(bids)) {
    const team = state.teams.find((t) => t.id === parseInt(teamId));
    if (team) {
      team.credits -= parseInt(amount);
      state.currentPool += parseInt(amount);
    }
  }

  // Find active team: highest bid, tiebreak: fewest credits, fewest tokens, UI order
  let sorted = [...state.teams].sort((a, b) => {
    const ba = parseInt(bids[a.id] || 0);
    const bb = parseInt(bids[b.id] || 0);
    if (bb !== ba) return bb - ba;
    if (a.credits !== b.credits) return a.credits - b.credits;
    if (a.tokens !== b.tokens) return a.tokens - b.tokens;
    return a.id - b.id;
  });
  state.activeTeamId = sorted[0].id;

  // Build bid order for passing
  state.bidOrder = sorted.map((t) => t.id);
  state.bidOrderIndex = 0;

  state.phase = 'subcategory';
  saveState(state);
  res.json(state);
});

// POST select subcategory
app.post('/api/select-subcategory', (req, res) => {
  const state = loadState();
  pushHistory(state);

  const { subcategory } = req.body;
  const questions = loadQuestions();

  const q = questions.find((q) => q.Kategoria === state.currentCategory && q.Podkategoria === subcategory);
  state.currentSubcategory = subcategory;
  state.currentQuestion = q;
  state.phase = 'question';
  state.abcdRevealed = false;
  state.abcdWrongOptions = [];
  state.marginUsed = false;

  // Mark subcategory used
  if (!state.usedQuestionKeys) state.usedQuestionKeys = [];
  state.usedQuestionKeys.push(`${state.currentCategory}|${subcategory}`);

  saveState(state);
  res.json(state);
});

// POST change subcategory (spend token)
app.post('/api/change-subcategory', (req, res) => {
  const state = loadState();
  pushHistory(state);

  const team = state.teams.find((t) => t.id === state.activeTeamId);
  if (team && team.tokens > 0) team.tokens -= 1;

  state.currentSubcategory = null;
  state.currentQuestion = null;
  state.phase = 'subcategory';
  state.abcdRevealed = false;
  state.abcdWrongOptions = [];
  state.marginUsed = false;

  saveState(state);
  res.json(state);
});

// POST reveal ABCD
app.post('/api/reveal-abcd', (req, res) => {
  const state = loadState();
  pushHistory(state);

  const team = state.teams.find((t) => t.id === state.activeTeamId);
  if (team && team.tokens > 0) team.tokens -= 1;
  state.abcdRevealed = true;

  saveState(state);
  res.json(state);
});

// POST use margin
app.post('/api/use-margin', (req, res) => {
  const state = loadState();
  pushHistory(state);

  const team = state.teams.find((t) => t.id === state.activeTeamId);
  if (team && team.tokens > 0) team.tokens -= 1;
  state.marginUsed = true;

  saveState(state);
  res.json(state);
});

// POST correct answer
app.post('/api/correct-answer', (req, res) => {
  const state = loadState();
  pushHistory(state);

  const { longshot } = req.body;
  const pool = state.currentPool;

  state.phase = 'summary';
  state.questionResult = {
    type: 'correct',
    teamId: state.activeTeamId,
    pool,
    longshot: !!longshot,
    earned: pool,
  };

  saveState(state);
  res.json(state);
});

// POST wrong answer (no token for active team, just move to next)
app.post('/api/wrong-answer', (req, res) => {
  const state = loadState();
  pushHistory(state);

  // No token for active team — just advance to next
  state.bidOrderIndex = (state.bidOrderIndex || 0) + 1;
  if (state.bidOrderIndex >= state.bidOrder.length) {
    state.phase = 'summary';
    state.questionResult = {
      type: 'passed',
      pool: state.currentPool,
    };
  } else {
    state.activeTeamId = state.bidOrder[state.bidOrderIndex];
  }

  saveState(state);
  res.json(state);
});

// POST pass question
app.post('/api/pass-question', (req, res) => {
  const state = loadState();
  pushHistory(state);

  // Give current active team a token
  const team = state.teams.find((t) => t.id === state.activeTeamId);
  if (team) team.tokens += 1;

  // Next team in bid order
  state.bidOrderIndex = (state.bidOrderIndex || 0) + 1;
  if (state.bidOrderIndex >= state.bidOrder.length) {
    // All teams passed
    state.phase = 'summary';
    state.questionResult = {
      type: 'passed',
      pool: state.currentPool,
    };
  } else {
    state.activeTeamId = state.bidOrder[state.bidOrderIndex];
  }

  saveState(state);
  res.json(state);
});

// POST wrong ABCD option
app.post('/api/wrong-abcd', (req, res) => {
  const state = loadState();
  pushHistory(state);

  const { option } = req.body;
  if (!state.abcdWrongOptions) state.abcdWrongOptions = [];
  state.abcdWrongOptions.push(option);

  // Give token, next team
  const team = state.teams.find((t) => t.id === state.activeTeamId);
  if (team) team.tokens += 1;

  state.bidOrderIndex = (state.bidOrderIndex || 0) + 1;
  if (state.bidOrderIndex >= state.bidOrder.length) {
    state.phase = 'summary';
    state.questionResult = { type: 'passed', pool: state.currentPool };
  } else {
    state.activeTeamId = state.bidOrder[state.bidOrderIndex];
  }

  saveState(state);
  res.json(state);
});

// POST confirm summary
app.post('/api/confirm-summary', (req, res) => {
  const state = loadState();
  pushHistory(state);

  const config = state.config;

  // Apply result
  if (state.questionResult && state.questionResult.type === 'correct') {
    const team = state.teams.find((t) => t.id === state.questionResult.teamId);
    if (team) {
      team.credits += state.questionResult.earned;
      if (state.questionResult.longshot) team.tokens += 1;
    }
  }
  // Pool stays if passed (goes to next round pool? No - per spec it stays for now, just show "w puli pozostaje")
  // Actually per spec: pool is reset after correct answer. If passed it stays (goes nowhere in this question).

  // Move category to used
  if (state.currentCategory && !state.usedCategories.includes(state.currentCategory)) {
    state.usedCategories.push(state.currentCategory);
  }

  // Reset pool only if someone answered correctly; keep it if passed
  if (state.questionResult && state.questionResult.type === 'correct') {
    state.currentPool = 0;
  }
  // else: currentPool carries over to next question
  state.currentCategory = null;
  state.currentSubcategory = null;
  state.currentQuestion = null;
  state.bids = {};
  state.bidOrder = [];
  state.bidOrderIndex = 0;
  state.questionResult = null;
  state.abcdRevealed = false;
  state.abcdWrongOptions = [];
  state.marginUsed = false;
  state.activeTeamId = null;

  // Advance question/round
  const totalPerRound = config.questionsPerRound;
  const totalRounds = config.rounds;

  state.totalQuestions += 1;
  state.questionInRound += 1;

  if (state.questionInRound > totalPerRound) {
    // End of round
    state.round += 1;
    state.questionInRound = 1;

    if (state.round > totalRounds) {
      // Game over
      state.phase = 'gameover';
      saveState(state);
      return res.json(state);
    }

    // Add tokens between rounds
    for (const team of state.teams) {
      team.tokens += config.tokensBetweenRounds;
    }
  }

  state.phase = 'draw';
  saveState(state);
  res.json(state);
});

// POST update team (manual edit)
app.post('/api/update-team', (req, res) => {
  const state = loadState();
  pushHistory(state);

  const { teamId, credits, tokens } = req.body;
  const team = state.teams.find((t) => t.id === teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  if (credits !== undefined) team.credits = credits;
  if (tokens !== undefined) team.tokens = tokens;

  saveState(state);
  res.json(state);
});

// GET subcategories for current category
app.get('/api/subcategories', (req, res) => {
  const state = loadState();
  const questions = loadQuestions();
  const used = state.usedQuestionKeys || [];

  const subs = questions
    .filter((q) => q.Kategoria === state.currentCategory)
    .filter((q) => !used.includes(`${q.Kategoria}|${q.Podkategoria}`))
    .map((q) => q.Podkategoria);

  res.json([...new Set(subs)]);
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`\n🎡 Młyn o Siano działa na http://localhost:${PORT}\n`);
});
