# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Młyn o Siano" is a web-based quiz game show system for live events, inspired by Polish TV "Awantura o Kasę". Teams compete in real-time rounds with bidding, animated wheel category selection, and various question types.

## Commands

```bash
npm install       # Install dependencies
node server.js    # Start server at http://localhost:8080
npx prettier --write .  # Format code
```

No build step — the frontend is vanilla HTML/CSS/JS served as static files.

## Architecture

**Stack**: Node.js + Express backend, vanilla JS frontend (no framework).

**Key files**:
- [server.js](server.js) — Express server with REST API, reads/writes JSON state to disk
- [public/js/app.js](public/js/app.js) — All client logic; global `G` object holds game state
- [public/index.html](public/index.html) — Single-page app; screens shown/hidden via CSS classes
- [data/game_state.json](data/game_state.json) — Live game state, persisted after every action
- [data/game_history.json](data/game_history.json) — Undo/redo stack (max 50 snapshots)
- [config.json](config.json) — Teams, credits, tokens, rounds, question file path

**Game flow**: Init → Draw (animated canvas wheel) → Bid → Subcategory → Question → Summary → repeat until rounds exhausted → Final rankings.

**State management**: Server holds the canonical state in `game_state.json`. The client fetches state on each screen transition; there is no WebSocket — all updates are REST calls (GET/POST to `/api/*`).

**Undo/redo**: Each state-mutating action appends a full JSON snapshot to `game_history.json` before applying the change. Undo/redo pop from this stack.

**Questions**: Loaded from a tab-separated CSV (`data/questions.csv`). Two question types: `ABCD` (multiple choice with `Podpucha1-3` as distractors) and numeric (with `Margines` tolerance). The active question file path is set in `config.json`.

**Bidding**: Teams bid credits; "Va Bank" bets all credits. The current round's base tax and pool values come from `config.json` arrays indexed by round number.

## Configuration

`config.json` controls all game parameters. Docs in [docs/konfiguracja.md](docs/konfiguracja.md) (Polish). Key fields: `teams`, `startingCredits`, `startingTokens`, `rounds`, `questionsPerRound`, `baseTax`, `basePools`.

## Code Style

Prettier is configured in [.prettierrc](.prettierrc): 120-char line width, LF endings, with `prettier-plugin-organize-imports`.
