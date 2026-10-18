# KeyQuest — context for Claude

KeyQuest is a free, open-source typing tutor for kids, built as a modern stand-in for Mavis Beacon.
The owner is building it for their own kids and publishing it under MIT.

- Repo: https://github.com/ovurevu/keyquest (branch `main`)
- Live site: https://ovurevu.github.io/keyquest/ (GitHub Pages, deployed by Actions on every push to `main`)
- Status and backlog: [docs/ROADMAP.md](docs/ROADMAP.md)
- Why things are the way they are: [docs/DECISIONS.md](docs/DECISIONS.md)

## Hard rules

- **No build step and no runtime dependencies.** Plain HTML, CSS and ES2020 JavaScript loaded as classic `<script>` tags. It must keep working when `index.html` is double-clicked (a `file://` URL). No ES modules, no `fetch` of local files, no bundler.
- **Everything lives on the global `KQ` namespace.** Each file starts with `window.KQ = window.KQ || {};`.
- **Script order in `index.html` matters.** Data first, then engine, keyboard, audio, storage, the three games, and `app.js` last.
- **Kid-friendly content only.** All words, sentences and paragraphs must be safe and simple for ages 5 and up.
- **Generated exercises may only use keys the learner has been taught.** The test suite checks this across every lesson and skill level. Break it and `npm test` fails.

## File map

| File | What it owns |
| --- | --- |
| `index.html` | Every screen as a `<section id="screen-NAME" class="screen">`, plus script tags |
| `css/style.css` | All styles. Finger colours are `.finger-lp` … `.finger-th` custom properties |
| `js/data/words.js` | `KQ.WORDS`, `KQ.BIGRAMS`, `KQ.TRIGRAMS`, `KQ.SENTENCES`, `KQ.PARAGRAPHS` |
| `js/data/lessons.js` | Finger map, `KQ.LEVELS`, `RAW_LESSONS`, `KQ.UNITS`, exercise builders, weak-key detection, game word pools |
| `js/engine.js` | `KQ.TypingSession` (position, per-char state, WPM, accuracy, per-key stats) and `KQ.starsFor` |
| `js/keyboard.js` | On-screen keyboard, heatmap, SVG hands, `KQ.escapeHtml` |
| `js/audio.js` | Synthesised Web Audio sound effects, no audio files |
| `js/storage.js` | Profiles, settings, progress and mastery rules in `localStorage` |
| `js/game.js` | Letter Rain (`KQ.RainGame`) |
| `js/race.js` | Rocket Race (`KQ.RaceGame`, `KQ.raceText`) |
| `js/bubbles.js` | Bubble Pop (`KQ.BubbleGame`, `KQ.bubblePool`) |
| `js/app.js` | Screen navigation, all UI wiring, lesson flow, results, settings. One IIFE |
| `tests/e2e.js` | Playwright end-to-end suite, 39 checks, serves the repo itself |
| `.github/workflows/` | `test.yml` runs the suite, `pages.yml` deploys the repo root |

## How the app is wired

- **Screens.** `go(name)` runs the screen's render function, then `show(name)` toggles `.active`. Leaving a screen stops the practice timer, stops any running game, and hides the Caps Lock banner.
- **Key routing.** One `keydown` listener in `app.js` sends keys to `onPracticeKey` on the practice screen or `onGameKey` on a game screen.
- **Games share a naming convention.** A game named `x` needs `#screen-x`, `#x-overlay`, `#x-overlay-title`, `#x-overlay-text`, `#btn-x-start`, `#btn-x-quit`, and an entry in `GAME_SCREENS` in `app.js`. Game objects expose `reset`, `start`, `stop`, `input(ch)`, `running`, `paused` and `resume`. Rocket Race also exposes `counting` during its countdown.
- **Falling and rising items are positioned with `left` and `top`, not `transform`.** The pop and splat animations use `transform`, and the two used to fight each other.
- **Lessons.** `RAW_LESSONS` holds 24 lessons in 5 units. `buildLessons()` adds cumulative `allowed` key sets, `baseWpm` and `baseLen` from `UNIT_WPM` and `UNIT_LEN`, and `isTest` for review lessons. The intro lesson uses its own `own` key set.
- **Exercise generation.** `KQ.buildExercises(lesson, level)` picks a builder by `lesson.kind`: `intro`, `keys`, `review`, `shift`, `numbers`, `punct` or `story`. Exercises are regenerated on every attempt.
- **Sentence filtering.** `sentencesFor` lowercases sentences until Shift is taught, strips punctuation that isn't taught yet, and skips any sentence with an apostrophe until the apostrophe is taught.
- **Grading.** Normal lessons average all exercises. Review lessons are graded on the final unit test alone, and under 90% accuracy scores zero stars. The intro lesson always gives at least one star.
- **Mastery.** `store.mastered()` needs `KQ.MASTERY_STARS` (2) stars, or 1 for the intro. `store.unlockedIndex()` walks lessons until the first unmastered one. The "unlock all" setting bypasses this.
- **Weak keys.** `KQ.weakKeys` returns taught keys with at least 8 attempts and under 95% accuracy, worst first. The home screen card appears when there is at least one.
- **Skill levels.** `KQ.LEVELS` has `little`, `kid` and `big`, each multiplying target WPM, exercise length and game speed.

## Data and persistence

- Stored under the `localStorage` key `keyquest:v1` as `{ profiles: [...], currentId }`.
- A profile holds `settings` (including `level`), `lessons` by id, `keyStats` by character, `history` capped at 200, and `bests` for the three games.
- **Old data migrates lazily in code.** `store.settings()` fills missing settings from defaults. `bests()` in `app.js` converts the old single `bestGame` number. Any future schema change needs the same treatment, since families will have real progress saved.
- `mergeKeyStats` saves immediately so stats survive quitting a lesson halfway.

## Commands

```bash
# Run the app
python3 -m http.server 8765        # then open http://127.0.0.1:8765/index.html
# or just open index.html in a browser

# Tests (normal way)
npm install && npx playwright install chromium && npm test

# Tests on this machine without installing node_modules
CHROME_PATH=/usr/bin/google-chrome \
NODE_PATH=/home/ovurevu/.npm/_npx/e41f203b7505f1fb/node_modules \
node tests/e2e.js
```

- Set `HEADED=1` to watch the tests run.
- The Claude in Chrome extension is connected on this machine and useful for live checks against the local server.
- Always run the tests after touching `lessons.js`, `words.js`, `engine.js` or `storage.js`.

## Known gotchas

- **Export progress uses an `<a download>` link.** That works in browsers but will break inside Tauri, which needs its dialog plugin.
- **`docs/practice.png` is out of date.** It predates units, levels and the tricky-keys card.
- **Rocket Race's `slow` difficulty strips capitals and punctuation** from the passage so young kids can play.
- **Tests type fast on purpose.** WPM numbers in test output are in the hundreds, which is expected.
