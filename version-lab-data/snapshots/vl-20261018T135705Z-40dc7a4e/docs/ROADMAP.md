# KeyQuest roadmap

Last updated: 2026-09-16

## Shipped in v1.0 (initial commit `0e02cf1`)

- 24 lessons in 5 units: Getting Ready, home row, top row, bottom row, capitals, numbers, punctuation, stories.
- Generated drills per lesson: new-key patterns, alternating-hand rhythm, bigrams and trigrams, words, longer words, sentences.
- Unit tests at the end of each row unit, needing 90% accuracy.
- Mastery unlocking at 2 stars, with an "unlock all" override for parents.
- Skill levels for little kid, kid and big kid.
- Tricky-keys practice built from the per-key accuracy data.
- Three games: Letter Rain, Rocket Race, Bubble Pop.
- One-minute speed test, progress page with key heatmap, multiple profiles, JSON backup and restore.
- On-screen keyboard and hands with finger colours, synthesised sounds, Caps Lock warning.
- Playwright suite in CI, GitHub Pages deploy.

## Open before calling v1 "done done"

- [ ] **Real-kid trial.** Watch a child use it and decide on two tuning points:
  - Is 2 stars to unlock fair for the youngest level? Constant: `KQ.MASTERY_STARS` in `js/storage.js`.
  - Are four exercises too many for the early F/J lessons? See `buildKeys` in `js/data/lessons.js`.
  - Are speed targets right? `UNIT_WPM` and `KQ.LEVELS` in `js/data/lessons.js`.
- [ ] **License holder.** `LICENSE` says "KeyQuest contributors". The owner may want their name.
- [ ] **Refresh `docs/practice.png`** and consider adding screenshots of the lessons page and a game to the README.

## v1.1: desktop app with Tauri

Deferred on purpose. The web version already runs locally on any OS.

- [ ] Wrap the static site in Tauri with no changes to the web code beyond the export fix below.
- [ ] Replace the `<a download>` export in `js/app.js` with the Tauri dialog and filesystem plugins when running inside Tauri. Keep the browser path working.
- [ ] Add a fullscreen or kiosk option so kids can't wander into other windows.
- [ ] GitHub Actions matrix to build Windows, macOS and Linux installers and attach them to releases.
- [ ] Decide on code signing for macOS and Windows. Unsigned builds show scary warnings.
- [ ] App icon. The current icon is an emoji data URI.

## Later ideas, not committed to

- **Non-QWERTY layouts** such as AZERTY, QWERTZ and Dvorak. `KQ.FINGERS` and `KQ.LAYOUT` are ready for alternates, but there is no setting yet.
- **Offline support when hosted.** A service worker so the Pages site works offline after the first visit.
- **Accessibility review.** Only keyboard focus has been considered so far.
- **Touch devices.** Currently no on-screen input for tablets, which is arguably correct for a touch-typing tutor.
- **More content.** More paragraphs, themed story packs, translations.
- **Parent view.** A summary across all kids' profiles.
- **Daily goals or streaks** to encourage short regular practice.
