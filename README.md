# Brain Trainer

A lightweight, browser-based mental-math game using HTML, CSS, and vanilla JavaScript. No framework, server, build step, or runtime dependencies.

## Run locally

Open `index.html` in a modern browser, or for consistent browser storage run `python -m http.server 8000` and visit `http://localhost:8000`.

Choose **Easy**, **Medium**, or **Hard**, and click **Start Game**. For an alternative challenge, select **Challenge Mode → Time Attack** and answer 20 questions as quickly as possible.

## Features

- Timed addition, subtraction, multiplication, and harder-mode division
- Score, time bonuses, progressive difficulty, accuracy, personal bests
- Time Attack with up-counting timer and perfect-run personal best
- Scores and sound preference stored in browser `localStorage`
- Keyboard: **Enter** submit, **Escape** pause/resume, **Space** pause/resume outside the answer field or focused buttons
- Responsive layout, focus indicators, reduced-motion support

**Not yet available:** Precision Challenge and Endurance Test buttons are placeholders. This game is for math practice, not a scientifically validated cognitive treatment.

## Layout

```text
index.html                     # Static entry point (compatible with GitHub Pages)
assets/css/styles.css          # Styles
assets/js/script.js            # Game logic
docs/ARCHITECTURE.md           # Architecture, manual QA, limitations
docs/PROJECT_HISTORY.md        # Original development summary, preserved
tests/static.test.mjs          # Dependency-free smoke checks
.github/workflows/ci.yml       # GitHub Actions checks
.editorconfig                  # Whitespace conventions
.gitignore                     # Local and generated files
```

## Verify

The game needs no Node installation. Contributors can run static checks with Node.js 20 or later:

```bash
node --check assets/js/script.js
node --test tests/*.test.mjs
```

The same checks run in CI on pull requests and changes to `main`. **These are static checks, not end-to-end browser tests.** Manually verify gameplay in desktop and mobile browsers.

## Data

No account, API, backend, or third-party analytics are included. Records are saved only in local browser storage (keys starting with `brainTrainer`). Clearing browser site data removes those records. Google Fonts is loaded remotely when connected.

See [technical notes](docs/ARCHITECTURE.md) and [original project summary](docs/PROJECT_HISTORY.md).
