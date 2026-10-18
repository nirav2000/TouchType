# KeyQuest design decisions

Why the project is built the way it is. Check here before reopening a settled question.

## Plain HTML, CSS and JavaScript with no build

**Decision:** No framework, no bundler, no runtime dependencies. Classic script tags on a `KQ` namespace.

**Why:** The goal is "runs locally on any modern OS, forever". A double-clickable `index.html` needs no install, no Node, and nothing that can rot. It also makes contributions easy and the GitHub Pages deploy trivial.

**Cost accepted:** `app.js` is a single long file, and there are no types. Revisit only if the app grows a lot.

## localStorage, not SQLite

**Decision:** Progress lives in browser `localStorage`, with JSON export and import for moving between computers.

**Why:** The data is tiny, a few kilobytes per child. SQLite would need either a backend process or a WebAssembly build, both of which break the no-install goal. All persistence is isolated in `js/storage.js`, so a Tauri build could swap in SQLite later without touching the rest.

**Cost accepted:** Clearing browser data wipes progress, and progress doesn't sync between machines.

## Tauri deferred to v1.1

**Decision:** Ship the web version first, wrap it in Tauri later.

**Why:** The web version already meets the core need. Tauri's real cost is per-OS builds and code signing, not the wrapper itself.

## Curriculum shape

- **E and I come straight after the home row,** ahead of G and H. Real words become possible three lessons earlier, which keeps kids engaged.
- **Lesson 0 teaches posture and hand placement** before any typing, as the original Mavis Beacon did.
- **Drills are generated, never hand-written.** Every attempt gets fresh text, and a single rule enforces taught keys only.
- **Random letter soup was removed** in favour of bigrams, trigrams and alternating-hand rhythm, which build real typing patterns.
- **Mastery needs 2 stars,** because 1 star at 85% accuracy let kids race ahead without muscle memory.
- **Unit tests need 90% accuracy** and grade the review lesson on the test alone.
- **Skill levels scale targets** because a six-year-old and an eleven-year-old can't share one speed goal.

## Games

- **Letter Rain** drills whole words, **Rocket Race** drills sustained passages against a fixed pace, and **Bubble Pop** drills single-key location including Shift. They were chosen to cover different skills rather than to be three variants of one idea.
- Game speed and Robo's WPM scale with the profile's skill level.

## Testing

- **One end-to-end Playwright script** rather than unit tests. The app has no build and most bugs are in the wiring between screens, so driving the real UI catches more per line of test.
- The script starts its own static server so it needs nothing running beforehand.

## Name

- **KeyQuest** was confirmed by the owner. The README notes the project is not affiliated with Mavis Beacon.
