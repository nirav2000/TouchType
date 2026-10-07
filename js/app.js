// App controller: screens, profiles, lesson flow, weak-key practice, speed test, games, progress and settings.
(function () {
  const $ = (id) => document.getElementById(id);
  const store = KQ.store;
  const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🐙", "🦄", "🐯", "🐧", "🦖", "🐨", "🐝", "🐳"];
  const TEST_SECONDS = 60;

  const state = {
    screen: null,
    profile: null,
    lesson: null,        // current lesson object
    exercises: [],       // generated exercises for the lesson
    exIndex: 0,
    exResults: [],       // per-exercise stats
    session: null,       // KQ.TypingSession
    mode: null,          // "lesson" | "test" | "weak"
    timer: null,
    keyboard: null,
    heatKeyboard: null,
    game: null,
    gameName: null,
    selectedAvatar: AVATARS[0],
    selectedLevel: "kid",
  };

  // ---------- navigation ----------
  function show(name) {
    for (const el of document.querySelectorAll(".screen")) el.classList.remove("active");
    $("screen-" + name).classList.add("active");
    state.screen = name;
    $("btn-profile").classList.toggle("hidden", name === "profiles");
    if (name !== "practice") stopTimer();
    if (state.game && name !== state.gameName) { state.game.stop(); state.game = null; }
    if (name !== "practice" && !GAME_SCREENS.includes(name)) $("capslock").hidden = true;
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));

  function go(name) {
    const builders = { home: renderHome, lessons: renderLessons, progress: renderProgress, settings: renderSettings, games: renderGames, profiles: renderProfiles };
    if (builders[name]) builders[name]();
    show(name);
  }

  function settings() { return store.settings(state.profile); }
  function level() { return settings().level || "kid"; }
  function levelInfo() { return KQ.levelInfo(level()); }

  // ---------- profiles ----------
  function renderProfiles() {
    const list = $("profile-list");
    list.innerHTML = "";
    for (const p of store.profiles()) {
      const done = KQ.LESSONS.filter((l) => store.mastered(p, l)).length;
      const b = document.createElement("button");
      b.className = "profile-card";
      b.innerHTML = `<span class="avatar">${p.avatar}</span><span class="name">${KQ.escapeHtml(p.name)}</span><span class="sub">${done}/${KQ.LESSONS.length} lessons</span>`;
      b.addEventListener("click", () => selectProfile(p.id));
      list.appendChild(b);
    }
    const picker = $("avatar-picker");
    picker.innerHTML = "";
    for (const a of AVATARS) {
      const b = document.createElement("button");
      b.textContent = a;
      b.type = "button";
      b.classList.toggle("selected", a === state.selectedAvatar);
      b.addEventListener("click", () => {
        state.selectedAvatar = a;
        picker.querySelectorAll("button").forEach((x) => x.classList.toggle("selected", x.textContent === a));
      });
      picker.appendChild(b);
    }
    const levels = $("level-picker");
    levels.innerHTML = "";
    for (const [key, info] of Object.entries(KQ.LEVELS)) {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `${KQ.escapeHtml(info.label)}<small>${KQ.escapeHtml(info.ages)}</small>`;
      b.classList.toggle("selected", key === state.selectedLevel);
      b.addEventListener("click", () => {
        state.selectedLevel = key;
        levels.querySelectorAll("button").forEach((x, i) => x.classList.toggle("selected", Object.keys(KQ.LEVELS)[i] === key));
      });
      levels.appendChild(b);
    }
  }

  function selectProfile(id) {
    store.setCurrent(id);
    state.profile = store.current();
    KQ.audio.enabled = settings().sound;
    updateChip();
    go("home");
  }

  function createProfile() {
    const name = $("new-name").value.trim();
    if (!name) { $("new-name").focus(); return; }
    const p = store.createProfile(name, state.selectedAvatar, state.selectedLevel);
    $("new-name").value = "";
    selectProfile(p.id);
  }
  $("btn-create").addEventListener("click", createProfile);
  $("new-name").addEventListener("keydown", (e) => { if (e.key === "Enter") createProfile(); });

  function applyFocusMode() {
    const on = !!settings().focusMode;
    document.body.classList.toggle("focus-mode", on);
    $("btn-focus").setAttribute("aria-pressed", String(on));
    $("btn-focus").classList.toggle("active", on);
    $("btn-focus").title = on ? "Leave focus mode" : "Focus mode";
  }

  function updateChip() {
    $("chip-avatar").textContent = state.profile.avatar;
    $("chip-name").textContent = state.profile.name;
    $("btn-sound").textContent = settings().sound ? "🔊" : "🔇";
    applyFocusMode();
  }
  $("btn-focus").addEventListener("click", () => {
    if (!state.profile) return;
    settings().focusMode = !settings().focusMode;
    store.save();
    applyFocusMode();
  });
  $("btn-profile").addEventListener("click", () => go("profiles"));
  $("btn-home").addEventListener("click", () => (state.profile ? go("home") : go("profiles")));
  $("btn-sound").addEventListener("click", () => {
    if (!state.profile) return;
    settings().sound = !settings().sound;
    KQ.audio.enabled = settings().sound;
    store.save();
    updateChip();
  });

  // ---------- home ----------
  function nextLesson() { return KQ.LESSONS[store.unlockedIndex(state.profile)]; }
  function weakKeys() { return KQ.weakKeys(state.profile.keyStats, store.allowedKeys(state.profile)); }

  function renderHome() {
    const p = state.profile;
    const hour = new Date().getHours();
    const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    $("home-greeting").textContent = `${hello}, ${p.name}! ${p.avatar}`;
    const plan = KQ.buildAdaptivePlan(p);
    const status = plan.status;
    $("continue-title").textContent = plan.stage.title;
    const targetText = plan.targets.length ? plan.targets.map((w) => {
      const n = plan.repetitions[w] || 1;
      return n > 1 ? `${w} ×${n}` : w;
    }).join(" · ") : "Building your next practice set";
    $("continue-sub").textContent = targetText;
    $("adaptive-meta").innerHTML =
      `<span>${plan.dueCount} due for review</span><span>${status.masteredWords}/${status.wordGoal} focus words fluent</span><span>${status.ready ? "Ready to progress" : "Mastery first"}</span>`;
    $("btn-continue").onclick = startAdaptivePractice;

    const weak = weakKeys();
    $("home-weak").hidden = weak.length < 1;
    if (weak.length >= 1) {
      $("weak-keys").innerHTML = weak.map((k) => keyChip(k.ch)).join("");
      $("btn-weak").onclick = () => startWeakPractice(weak);
    }
  }
  $("nav-lessons").addEventListener("click", () => go("lessons"));
  $("nav-games").addEventListener("click", () => go("games"));
  $("nav-progress").addEventListener("click", () => go("progress"));
  $("nav-settings").addEventListener("click", () => go("settings"));
  $("nav-test").addEventListener("click", startSpeedTest);

  // ---------- lessons ----------
  function keyChip(k, big) {
    const finger = k === "Shift" ? "lp" : KQ.fingerFor(k);
    return `<span class="key-chip ${big ? "big" : ""} finger-${finger}">${KQ.escapeHtml(k === " " ? "Space" : k)}</span>`;
  }
  function starString(n) { return "★".repeat(n) + "☆".repeat(3 - n); }

  function renderLessons() {
    const grid = $("lesson-grid");
    grid.innerHTML = "";
    grid.className = "";
    const unlocked = store.unlockedIndex(state.profile);
    KQ.UNITS.forEach((unit, u) => {
      const lessons = KQ.LESSONS.filter((l) => l.unit === u);
      const done = lessons.filter((l) => store.mastered(state.profile, l)).length;
      const section = document.createElement("div");
      section.className = "unit";
      section.innerHTML = `<div class="unit-head"><span class="nav-icon">${unit.icon}</span><h2>Unit ${u + 1}: ${KQ.escapeHtml(unit.title)}</h2><span class="unit-progress">${done}/${lessons.length}</span></div>`;
      const cards = document.createElement("div");
      cards.className = "lesson-grid";
      for (const lesson of lessons) {
        const rec = state.profile.lessons[lesson.id];
        const locked = lesson.index > unlocked;
        const b = document.createElement("button");
        b.className = "lesson-card" + (locked ? " locked" : "") + (lesson.index === unlocked ? " current" : "")
          + (lesson.isTest ? " test" : "") + (store.mastered(state.profile, lesson) ? " mastered" : "");
        const keys = lesson.kind === "intro" ? '<span class="lesson-keys">🪑 🤚</span>' : `<span class="lesson-keys">${lesson.newKeys.map((k) => keyChip(k)).join("")}</span>`;
        b.innerHTML = `
          <span class="lesson-num">Lesson ${lesson.id}${lesson.isTest ? " · Test" : ""}</span>
          <span class="lesson-title">${KQ.escapeHtml(lesson.title)}</span>
          ${keys}
          <span class="lesson-stars">${starString(rec ? rec.stars : 0)}</span>
          ${locked ? '<span class="lock">🔒</span>' : ""}`;
        if (!locked) b.addEventListener("click", () => openIntro(lesson));
        cards.appendChild(b);
      }
      section.appendChild(cards);
      grid.appendChild(section);
    });
  }

  function openIntro(lesson) {
    state.lesson = lesson;
    $("intro-number").textContent = `Lesson ${lesson.id} · goal ${KQ.targetWpm(lesson, level())} WPM${lesson.isTest ? " · unit test at the end" : ""}`;
    $("intro-title").textContent = lesson.title;
    $("intro-keys").innerHTML = lesson.newKeys.map((k) => keyChip(k, true)).join("");
    $("intro-tip").textContent = lesson.tip;
    const checklist = $("intro-checklist");
    checklist.hidden = lesson.kind !== "intro";
    if (lesson.kind === "intro") checklist.innerHTML = KQ.POSTURE_TIPS.map(([icon, text]) => `<li><span>${icon}</span><span>${KQ.escapeHtml(text)}</span></li>`).join("");
    const fingers = [...new Set(lesson.newKeys.filter((k) => k !== "Shift").map((k) => KQ.fingerFor(k)))];
    $("intro-fingers").innerHTML = lesson.newKeys.filter((k) => k !== "Shift").map((k) => {
      const f = KQ.fingerFor(k);
      return `<span class="finger-tag finger-${f}">${KQ.escapeHtml(k)} → ${KQ.FINGER_NAMES[f]}</span>`;
    }).join("");
    $("intro-hands").innerHTML = KQ.handsSvg();
    const root = $("intro-hands");
    if (lesson.kind === "shift") fingers.push("lp", "rp");
    if (lesson.kind === "intro") fingers.push("lp", "lr", "lm", "li", "ri", "rm", "rr", "rp");
    for (const f of fingers) root.querySelector(`#finger-${f}`)?.classList.add("active");
    $("btn-start-lesson").onclick = () => startLesson(lesson);
    show("intro");
  }

  // ---------- practice ----------
  function startAdaptivePractice() {
    const plan = KQ.buildAdaptivePlan(state.profile);
    state.mode = "adaptive";
    state.lesson = null;
    state.adaptivePlan = plan;
    state.exercises = plan.exercises;
    state.exIndex = 0;
    state.exResults = [];
    startExercise();
  }

  function startLesson(lesson) {
    state.mode = "lesson";
    state.lesson = lesson;
    state.exercises = KQ.buildExercises(lesson, level(), state.profile);
    state.exIndex = 0;
    state.exResults = [];
    startExercise();
  }

  function startWeakPractice(weak) {
    state.mode = "weak";
    state.lesson = null;
    state.weak = weak;
    state.exercises = KQ.buildWeakKeyExercises(weak, store.allowedKeys(state.profile), level());
    state.exIndex = 0;
    state.exResults = [];
    startExercise();
  }

  function startExercise() {
    const ex = state.exercises[state.exIndex];
    const prefix = state.mode === "weak" ? "Tricky keys" : state.mode === "adaptive" ? "Today's adaptive practice" : `Lesson ${state.lesson.id}`;
    $("practice-sub").textContent = `${prefix} · Exercise ${state.exIndex + 1} of ${state.exercises.length}`;
    $("practice-title").textContent = ex.test ? `Unit test: ${ex.name}` : ex.name;
    $("stat-time-label").textContent = "Time";
    beginSession(ex.text);
  }

  function startSpeedTest() {
    state.mode = "test";
    state.lesson = null;
    $("practice-sub").textContent = "Speed test";
    $("practice-title").textContent = "One minute. Type as much as you can!";
    $("stat-time-label").textContent = "Left";
    beginSession(KQ.speedTestText());
  }

  function beginSession(text) {
    state.session = new KQ.TypingSession(text, { stopOnError: settings().stopOnError });
    if (!state.keyboard) state.keyboard = new KQ.Keyboard($("kb-practice"));
    $("kb-practice").classList.toggle("hidden", !settings().showKeyboard);
    $("hands-practice").classList.toggle("hidden", !settings().showHands);
    if (!$("hands-practice").innerHTML) $("hands-practice").innerHTML = KQ.handsSvg();
    renderText();
    updateStats();
    show("practice");
    $("text-display").focus();
    updateHint();
  }

  function renderText() {
    const s = state.session;
    const box = $("text-display");
    box.innerHTML = "";
    let i = 0;
    for (const word of s.text.split(/(?<= )/)) { // keep trailing space with each word
      const w = document.createElement("span");
      w.className = "w";
      for (const ch of word) {
        const c = document.createElement("span");
        c.className = "c" + (ch === " " ? " sp" : "");
        c.textContent = ch;
        c.dataset.i = i++;
        w.appendChild(c);
      }
      box.appendChild(w);
    }
    state.chars = box.querySelectorAll(".c");
    paintChars();
  }

  const STATE_CLASS = { 1: "correct", 2: "wrong", 3: "fixed" };
  function paintChars() {
    state.chars.forEach((el, i) => paintChar(i));
  }

  function paintChar(i) {
    const s = state.session;
    const el = state.chars[i];
    if (!el) return;
    el.className = "c" + (s.text[i] === " " ? " sp" : "");
    if (s.states[i]) el.classList.add(STATE_CLASS[s.states[i]]);
    if (i === s.pos && !s.done) { el.classList.add("cur"); el.scrollIntoView({ block: "nearest" }); }
  }

  function updateHint() {
    const s = state.session;
    const ch = s.expected;
    state.keyboard.highlight(ch);
    KQ.highlightFinger($("hands-practice"), ch);
    if (ch == null) { $("hint-line").textContent = ""; return; }
    const { key, shift } = KQ.keyFor(ch);
    const f = KQ.FINGERS[key];
    const label = ch === " " ? "Space" : ch;
    const shiftNote = shift ? ` (hold Shift with your ${f && f[0] === "l" ? "right" : "left"} pinky)` : "";
    $("hint-line").innerHTML = (s.started ? "Next: " : "Start typing! First key: ") +
      `<span class="key-chip finger-${f || "th"}">${KQ.escapeHtml(label)}</span> with your ${f ? KQ.FINGER_NAMES[f] : "thumb"}${shiftNote}`;
  }

  function updateStats() {
    const st = state.session.stats();
    $("stat-wpm").textContent = st.wpm;
    $("stat-acc").textContent = st.accuracy + "%";
    if (state.mode === "test") {
      const left = Math.max(0, TEST_SECONDS - st.seconds);
      $("stat-time").textContent = fmtTime(state.session.started ? left : TEST_SECONDS);
    } else {
      $("stat-time").textContent = fmtTime(st.seconds);
    }
    $("practice-progress").style.width = (st.progress * 100) + "%";
  }
  function fmtTime(sec) { return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; }

  function startTimer() {
    stopTimer();
    state.timer = setInterval(() => {
      if (!state.session || state.session.done) return;
      updateStats();
      if (state.mode === "test" && state.session.elapsedMs() >= TEST_SECONDS * 1000) {
        state.session.finish();
        finishExercise();
      }
    }, 250);
  }
  function stopTimer() { if (state.timer) clearInterval(state.timer); state.timer = null; }

  function onPracticeKey(e) {
    const s = state.session;
    if (!s || s.done) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { quitPractice(); return; }
    if (e.key === "Backspace") {
      e.preventDefault();
      const prevPos = s.pos;
      if (s.backspace()) { paintChar(prevPos); paintChar(s.pos); updateHint(); }
      return;
    }
    if (e.key.length !== 1) { if (e.key === "Tab") e.preventDefault(); return; }
    e.preventDefault();
    const wasStarted = s.started;
    const pos = s.pos;
    const result = s.input(e.key);
    if (!wasStarted && s.started) startTimer();
    paintChar(pos);
    paintChar(s.pos);
    if (result === "wrong") {
      KQ.audio.wrong();
      state.keyboard.flash(e.key, "wrong");
      const box = $("text-display");
      box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
    } else {
      KQ.audio.click();
      state.keyboard.flash(e.key, "pressed");
    }
    updateStats();
    if (result === "complete") finishExercise();
    else updateHint();
  }

  function quitPractice() {
    stopTimer();
    state.session = null;
    go(state.mode === "lesson" ? "lessons" : "home");
  }
  $("btn-quit").addEventListener("click", quitPractice);
  $("btn-restart").addEventListener("click", () => {
    stopTimer();
    if (state.mode === "test") startSpeedTest(); else startExercise();
  });

  // ---------- results ----------
  function finishExercise() {
    stopTimer();
    const s = state.session;
    const st = s.stats();
    store.recordAdaptiveSession(state.profile, s);
    const activeExercise = state.mode === "test" ? null : state.exercises[state.exIndex];
    store.recordDrill(state.profile, {
      mode: state.mode,
      stage: state.mode === "adaptive" ? state.adaptivePlan?.stage?.id : null,
      stageTitle: state.mode === "adaptive" ? state.adaptivePlan?.stage?.title : null,
      exercise: activeExercise?.name || (state.mode === "test" ? "Speed test" : "Practice"),
      exerciseIndex: state.exIndex,
      targets: activeExercise?.targets || [],
      wpm: st.wpm,
      accuracy: st.accuracy,
      errors: st.errors,
      seconds: st.seconds,
      latency: st.avgLatencyMs,
      hesitation: st.hesitationRate,
      timingSamples: st.timingSamples,
    });
    state.keyboard.clearHighlight();
    KQ.highlightFinger($("hands-practice"), null);

    if (state.mode === "test") {
      store.addHistory(state.profile, { type: "test", label: "Speed test", wpm: st.wpm, acc: st.accuracy, errors: st.errors, seconds: st.seconds });
      store.save();
      const stars = KQ.starsFor(st.wpm, st.accuracy, Math.round(20 * levelInfo().wpm));
      showResults({
        eyebrow: "Speed test", title: "Time's up!", stars, stats: st,
        message: st.wpm >= 30 ? "Whoa, speedy!" : st.wpm >= 15 ? "Great pace. Keep it up!" : "Nice work. Speed comes with practice.",
        next: { label: "Try again ▶", action: startSpeedTest }, back: { label: "Home", action: () => go("home") },
        retry: null,
      });
      return;
    }

    state.exResults[state.exIndex] = st;
    const isLast = state.exIndex >= state.exercises.length - 1;
    const ex = state.exercises[state.exIndex];

    if (state.mode === "adaptive") {
      const target = Math.round(12 * levelInfo().wpm);
      const stars = KQ.starsFor(st.wpm, st.accuracy, target);
      if (!isLast) {
        showResults({
          eyebrow: `Adaptive practice · ${state.exIndex + 1} of ${state.exercises.length}`,
          title: st.accuracy >= 97 && (st.hesitationRate || 0) < 15 ? "Smooth!" : "Good practice",
          stars, stats: st, message: encouragement(st, target),
          next: { label: "Next step ▶", action: () => { state.exIndex++; startExercise(); } },
          retry: { label: "↻ Repeat", action: startExercise },
          back: { label: "Home", action: () => go("home") },
        });
        return;
      }
      const agg = aggregate(state.exResults);
      const before = state.adaptivePlan.status.stage.index;
      const status = KQ.adaptiveStageStatus(state.profile);
      if (status.ready && before < KQ.ADAPTIVE_STAGES.length - 1) {
        state.profile.adaptiveStage = before + 1;
      }
      store.addHistory(state.profile, {
        type: "adaptive", label: "Adaptive practice: " + state.adaptivePlan.stage.title,
        wpm: agg.wpm, acc: agg.accuracy, errors: agg.errors, seconds: agg.seconds,
        latency: agg.avgLatencyMs, hesitation: agg.hesitationRate
      });
      store.save();
      const progressed = (state.profile.adaptiveStage || 0) > before;
      const nextPlan = KQ.buildAdaptivePlan(state.profile);
      const advice = store.continuationAdvice(state.profile);
      const dueWords = nextPlan.targets.slice(0, 4).join(", ");
      const improvement = adaptiveProgressMessage(state.profile, agg);
      showResults({
        eyebrow: "Today's adaptive practice complete",
        title: progressed ? "Pattern mastered — next keys unlocked! 🎉" : "Practice stored ✓",
        stars: KQ.starsFor(agg.wpm, agg.accuracy, target), stats: agg,
        message: progressed
          ? `${improvement} Next stage: ${KQ.adaptiveStageFor(state.profile).title}.`
          : `${improvement} Likely to appear again: ${dueWords || "the weakest current patterns"}.`,
        next: { label: "View progress ▶", action: () => go("progress") },
        retry: { label: advice.stop ? "Practice more anyway" : "Continue practice", action: startAdaptivePractice },
        back: { label: "Home", action: () => go("home") },
        note: advice.reason,
        stopRecommended: advice.stop,
      });
      return;
    }

    if (state.mode === "weak") {
      const target = Math.round(12 * levelInfo().wpm);
      const stars = KQ.starsFor(st.wpm, st.accuracy, target);
      if (!isLast) {
        KQ.audio.pop();
        showResults({
          eyebrow: `Tricky keys · Exercise ${state.exIndex + 1} of ${state.exercises.length}`,
          title: stars >= 2 ? "Great job!" : "Nice!", stars, stats: st, message: encouragement(st, target),
          next: { label: "Next exercise ▶", action: () => { state.exIndex++; startExercise(); } },
          retry: { label: "↻ Try again", action: startExercise },
          back: { label: "Home", action: () => go("home") },
        });
        return;
      }
      const agg = aggregate(state.exResults);
      store.addHistory(state.profile, { type: "practice", label: "Tricky keys: " + state.weak.map((k) => k.ch).join(" "), wpm: agg.wpm, acc: agg.accuracy, errors: agg.errors, seconds: agg.seconds });
      store.save();
      KQ.audio.success();
      const stillWeak = weakKeys();
      showResults({
        eyebrow: "Tricky keys practice complete", title: "Workout done! 💪", stars: KQ.starsFor(agg.wpm, agg.accuracy, target), stats: agg,
        message: stillWeak.length ? `Keep an eye on ${stillWeak.map((k) => k.ch.toUpperCase()).join(", ")}. Practice again any time from the home screen.` : "Your tricky keys aren't so tricky any more!",
        next: { label: "Home ▶", action: () => go("home") }, retry: { label: "↻ Again", action: () => startWeakPractice(weakKeys().length ? weakKeys() : state.weak) }, back: { label: "Lessons", action: () => go("lessons") },
      });
      return;
    }

    const lesson = state.lesson;
    const target = KQ.targetWpm(lesson, level());
    if (!isLast) {
      const stars = KQ.starsFor(st.wpm, st.accuracy, target);
      if (stars >= 2) KQ.audio.success(); else KQ.audio.pop();
      showResults({
        eyebrow: `Lesson ${lesson.id} · Exercise ${state.exIndex + 1} of ${state.exercises.length}`,
        title: stars === 3 ? "Perfect!" : stars === 2 ? "Great job!" : stars === 1 ? "Nice!" : "Keep practicing!",
        stars, stats: st, message: encouragement(st, target) + (state.exercises[state.exIndex + 1].test ? " Next up: the unit test!" : ""),
        next: { label: "Next exercise ▶", action: () => { state.exIndex++; startExercise(); } },
        retry: { label: "↻ Try again", action: startExercise },
        back: { label: "Lessons", action: () => go("lessons") },
      });
      return;
    }

    // Lesson complete. Test lessons are graded on the unit test alone; others on the average.
    const agg = ex.test ? st : aggregate(state.exResults);
    let stars = KQ.starsFor(agg.wpm, agg.accuracy, target);
    const failedTest = ex.test && agg.accuracy < 90;
    if (failedTest) stars = 0;
    if (lesson.kind === "intro") stars = Math.max(1, stars);
    store.recordLesson(state.profile, lesson, { stars, wpm: agg.wpm, accuracy: agg.accuracy, errors: agg.errors, seconds: agg.seconds });
    const mastered = store.mastered(state.profile, lesson);
    if (mastered) KQ.audio.fanfare(); else if (stars > 0) KQ.audio.success(); else KQ.audio.pop();
    const next = KQ.LESSONS[lesson.index + 1];
    const unlockedNext = next && store.unlockedIndex(state.profile) >= next.index;
    let message;
    if (failedTest) message = "The unit test needs 90% accuracy. Slow down, look at the screen, and try it again.";
    else if (!mastered) message = `You need ${KQ.MASTERY_STARS} stars to unlock the next lesson: ${agg.accuracy < 92 ? "aim for 92% accuracy" : `aim for ${target} WPM`}. You can do it!`;
    else if (unlockedNext) message = next.index === lesson.index + 1 && !state.profile.lessons[next.id] ? `You unlocked Lesson ${next.id}: ${next.title}!` : "Lesson mastered!";
    else if (!next) message = "You finished every lesson. You're a typing champion!";
    else message = "";
    showResults({
      eyebrow: ex.test ? `Lesson ${lesson.id} · Unit test` : `Lesson ${lesson.id} complete`,
      title: failedTest ? "Not quite yet" : stars === 3 ? "Superstar! 🌟" : stars === 2 ? "Awesome! 🎉" : stars === 1 ? "Lesson done! 👏" : "So close!",
      stars, stats: agg, message,
      next: unlockedNext && mastered ? { label: "Next lesson ▶", action: () => openIntro(next) } : { label: "Try again ▶", action: () => startLesson(lesson) },
      retry: unlockedNext && mastered ? { label: "↻ Try again", action: () => startLesson(lesson) } : null,
      back: { label: "Lessons", action: () => go("lessons") },
    });
  }

  function aggregate(results) {
    const timing = results.filter((r) => r.timingSamples > 0);
    const timingSamples = timing.reduce((a, r) => a + r.timingSamples, 0);
    return {
      wpm: Math.round(results.reduce((a, r) => a + r.wpm, 0) / results.length),
      accuracy: Math.round(results.reduce((a, r) => a + r.accuracy, 0) / results.length),
      errors: results.reduce((a, r) => a + r.errors, 0),
      seconds: results.reduce((a, r) => a + r.seconds, 0),
      timingSamples,
      avgLatencyMs: timingSamples ? Math.round(timing.reduce((a, r) => a + r.avgLatencyMs * r.timingSamples, 0) / timingSamples) : 0,
      hesitationRate: timingSamples ? Math.round(timing.reduce((a, r) => a + r.hesitationRate * r.timingSamples, 0) / timingSamples) : 0,
    };
  }

  function adaptiveProgressMessage(profile, current) {
    const prior = profile.history.filter((h) => h.type === "adaptive").slice(1, 2)[0];
    if (!prior) return `Baseline saved: ${current.accuracy}% accuracy, ${current.hesitationRate || 0}% hesitation.`;
    const acc = current.accuracy - (prior.acc || 0);
    const hes = (prior.hesitation || 0) - (current.hesitationRate || 0);
    const bits = [];
    if (Math.abs(acc) >= 1) bits.push(`accuracy ${acc > 0 ? "+" : ""}${acc}%`);
    if (Math.abs(hes) >= 2) bits.push(`hesitation ${hes > 0 ? "down " : "up "}${Math.abs(hes)} points`);
    return bits.length ? `Since the previous block: ${bits.join(", ")}.` : "Performance is broadly stable; retention after a break is now more useful than more immediate repetition.";
  }

  function encouragement(st, target) {
    if (st.accuracy < 85) return "Accuracy first, speed later. Try slowing down a little.";
    if (st.accuracy < 92) return "Almost there. A little more care will earn more stars.";
    if ((st.hesitationRate || 0) >= 15) return "Accurate — now make the reaches smoother. A few keys still make you pause.";
    if (st.wpm < target) return `Great accuracy! Aim for ${target} WPM to earn more stars.`;
    return "Fast, accurate and smooth. Keep it up!";
  }

  function showResults(r) {
    $("results-eyebrow").textContent = r.eyebrow;
    $("results-title").textContent = r.title;
    $("results-stars").innerHTML = [1, 2, 3].map((n) => `<span class="star ${n <= r.stars ? "on" : ""}">★</span>`).join("");
    $("results-wpm").textContent = r.stats.wpm;
    $("results-acc").textContent = r.stats.accuracy + "%";
    $("results-errors").textContent = r.stats.errors;
    $("results-time").textContent = fmtTime(r.stats.seconds);
    $("results-message").textContent = r.message || "";
    const note = $("results-note");
    if (note) {
      note.hidden = !r.note;
      note.classList.toggle("stop-note", !!r.stopRecommended);
      note.textContent = r.note || "";
    }
    const nextBtn = $("btn-results-next"), retryBtn = $("btn-results-retry"), backBtn = $("btn-results-back");
    nextBtn.textContent = r.next.label; nextBtn.onclick = r.next.action;
    retryBtn.style.display = r.retry ? "" : "none";
    if (r.retry) { retryBtn.textContent = r.retry.label; retryBtn.onclick = r.retry.action; }
    backBtn.textContent = r.back.label; backBtn.onclick = r.back.action;
    show("results");
    nextBtn.focus();
  }

  // ---------- games ----------
  const GAME_SCREENS = ["rain", "race", "bubbles"];
  function bests() {
    const p = state.profile;
    if (!p.bests) p.bests = { rain: p.bestGame || 0, race: 0, bubbles: 0 };
    return p.bests;
  }
  function renderGames() {
    const b = bests();
    $("rain-best").textContent = b.rain;
    $("race-best").textContent = b.race;
    $("bubbles-best").textContent = b.bubbles;
  }
  document.querySelectorAll("[data-rain]").forEach((b) => b.addEventListener("click", () => openRain(b.dataset.rain)));
  document.querySelectorAll("[data-race]").forEach((b) => b.addEventListener("click", () => openRace(b.dataset.race)));
  document.querySelectorAll("[data-bubbles]").forEach((b) => b.addEventListener("click", () => openBubbles(b.dataset.bubbles)));

  function overlay(name, title, text, button) {
    $(`${name}-overlay-title`).textContent = title;
    $(`${name}-overlay-text`).textContent = text;
    $(`btn-${name}-start`).textContent = button;
    $(`${name}-overlay`).classList.remove("hidden");
  }
  function startGame() {
    if (!state.game) return;
    $(`${state.gameName}-overlay`).classList.add("hidden");
    state.game.start();
    $(`btn-${state.gameName}-start`).blur();
  }
  function recordScore(name, label, score) {
    const b = bests();
    const isBest = score > b[name] && score > 0;
    b[name] = Math.max(b[name], score);
    store.addHistory(state.profile, { type: "game", label, wpm: null, acc: null, errors: null, seconds: null, score });
    store.save();
    return { isBest, best: b[name] };
  }
  for (const name of GAME_SCREENS) {
    $(`btn-${name}-start`).addEventListener("click", startGame);
    $(`btn-${name}-quit`).addEventListener("click", () => go("games"));
  }

  function openRain(difficulty) {
    show("rain");
    state.gameName = "rain";
    state.game = new KQ.RainGame($("rain-area"), { score: $("rain-score"), level: $("rain-level"), lives: $("rain-lives") }, {
      words: KQ.gameWords(difficulty), speedScale: levelInfo().speed,
      onEnd: (score) => {
        KQ.audio.lose();
        const { isBest, best } = recordScore("rain", "Letter Rain", score);
        overlay("rain", isBest ? "New best score! 🏆" : "Game over", `You scored ${score}. Best: ${best}.`, "Play again ▶");
      },
    });
    overlay("rain", "Letter Rain", "Type the falling words before they hit the ground. Press Play or any key to start!", "Play ▶");
    state.game.reset();
  }

  const ROBO_WPM = { slow: 10, medium: 20, fast: 35 };
  function openRace(difficulty) {
    show("race");
    state.gameName = "race";
    const opponentWpm = Math.max(5, Math.round((ROBO_WPM[difficulty] || 20) * levelInfo().wpm));
    $("race-robo-wpm").textContent = opponentWpm;
    state.game = new KQ.RaceGame(
      { text: $("race-text"), player: $("race-player"), robo: $("race-robo"), wpm: $("race-wpm"), countdown: $("race-countdown") },
      {
        text: KQ.raceText(difficulty), opponentWpm,
        onEnd: (r) => {
          if (r.won) KQ.audio.fanfare(); else KQ.audio.lose();
          const { isBest, best } = recordScore("race", "Rocket Race", r.won ? r.wpm : 0);
          overlay("race",
            r.won ? (isBest ? "You win! New best speed! 🏆" : "You win! 🚀") : "Robo wins this time 🛸",
            `You typed ${r.wpm} WPM with ${r.accuracy}% accuracy. Best winning speed: ${best} WPM.`,
            "Race again ▶");
        },
      });
    overlay("race", "Rocket Race", `Beat Robo's ${opponentWpm} WPM rocket to the finish line. Press Play or any key to start!`, "Play ▶");
    state.game.reset();
  }

  function openBubbles(difficulty) {
    show("bubbles");
    state.gameName = "bubbles";
    state.game = new KQ.BubbleGame($("bubbles-area"), { score: $("bubbles-score"), level: $("bubbles-level"), lives: $("bubbles-lives") }, {
      pool: KQ.bubblePool(difficulty), speedScale: levelInfo().speed,
      onEnd: (score) => {
        KQ.audio.lose();
        const { isBest, best } = recordScore("bubbles", "Bubble Pop", score);
        overlay("bubbles", isBest ? "New best score! 🏆" : "Game over", `You popped your way to ${score}. Best: ${best}.`, "Play again ▶");
      },
    });
    overlay("bubbles", "Bubble Pop", "Press the letter in each bubble before it floats away. Hold Shift for capitals! Press Play or any key to start!", "Play ▶");
    state.game.reset();
  }

  function onGameKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { go("games"); return; }
    if (!state.game) return;
    if (!state.game.running) {
      if (state.game.counting) return; // race countdown in progress
      if (e.key.length === 1 || e.key === "Enter") { e.preventDefault(); startGame(); }
      return;
    }
    if (e.key.length !== 1) return;
    e.preventDefault();
    if (state.game.paused) state.game.resume();
    const r = state.game.input(e.key);
    if (r === "wrong") KQ.audio.wrong();
    else if (r === "complete") KQ.audio.pop();
    else if (r === "correct") KQ.audio.click();
  }

  // ---------- progress ----------
  function renderProgress() {
    const p = state.profile;
    const done = KQ.LESSONS.filter((l) => store.mastered(p, l)).length;
    const stars = Object.values(p.lessons).reduce((a, r) => a + r.stars, 0);
    const bestWpm = p.history.reduce((a, h) => Math.max(a, h.wpm || 0), 0);
    const accs = p.history.filter((h) => h.acc != null);
    const avgAcc = accs.length ? Math.round(accs.reduce((a, h) => a + h.acc, 0) / accs.length) : 0;
    const snap = store.learningSnapshot(p);
    const status = KQ.adaptiveStageStatus(p);
    $("progress-summary").innerHTML = [
      [snap.adaptiveSessions, "Adaptive sessions"], [snap.totalDrills, "Drills stored"], [snap.masteredWords, "Fluent words"],
      [snap.dueNow, "Due now"], [snap.totalMinutes + " min", "Practice stored"], [bestWpm, "Best WPM"], [avgAcc + "%", "Avg accuracy"],
    ].map(([v, l]) => `<div class="stat"><span class="stat-val">${v}</span><span class="stat-label">${l}</span></div>`).join("");

    $("progress-stage-title").textContent = status.stage.title;
    $("progress-stage-detail").innerHTML =
      `<div class="meter-row"><span>Focus words fluent</span><strong>${status.masteredWords}/${status.wordGoal}</strong></div>` +
      status.keyDetails.map((k) => `<div class="meter-row"><span>${k.ch.toUpperCase()} key</span><strong>${k.attempts ? Math.round(k.accuracy)+"% · "+(Number.isFinite(k.latency)?Math.round(k.latency)+" ms":"learning") : "not measured"}</strong></div>`).join("") +
      `<p class="muted small">${status.ready ? "Mastery threshold reached; the next stage can unlock." : "Still building automaticity. Early restricted-key drills are judged mainly by accuracy and hesitation, not headline WPM."}</p>`;

    const due = snap.dueWords;
    const upcoming = snap.upcoming;
    $("progress-review-forecast").innerHTML = due.length
      ? `<p><strong>Due now:</strong> ${due.map(x=>KQ.escapeHtml(x.word)).join(", ")}</p>`
      : `<p><strong>Nothing overdue.</strong></p>`;
    if (upcoming.length) $("progress-review-forecast").innerHTML += `<p><strong>Likely next:</strong> ${upcoming.slice(0,8).map(x=>`${KQ.escapeHtml(x.word)} <span class="muted">(${relativeDue(x.due)})</span>`).join(" · ")}</p>`;

    const drills = (p.drillRecords || []).slice(0, 50);
    $("progress-drills").innerHTML = `<tr><th>When</th><th>Drill</th><th>Targets</th><th>Accuracy</th><th>Hesitation</th><th>WPM</th></tr>` +
      (drills.length ? drills.map((d) => `<tr><td>${new Date(d.date).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}</td><td>${KQ.escapeHtml(d.exercise)}</td><td>${(d.targets||[]).map(KQ.escapeHtml).join(", ") || "–"}</td><td>${d.accuracy}%</td><td>${d.timingSamples ? d.hesitation+"%" : "–"}</td><td>${d.wpm}</td></tr>`).join("") : `<tr><td colspan="6" class="muted">No drills stored yet.</td></tr>`);

    if (!state.heatKeyboard) state.heatKeyboard = new KQ.Keyboard($("kb-heat"));
    state.heatKeyboard.heatmap(p.keyStats);

    $("progress-lessons").innerHTML = `<tr><th>Lesson</th><th>Stars</th><th>Best WPM</th><th>Best accuracy</th><th>Times done</th></tr>` +
      KQ.LESSONS.map((l) => {
        const r = p.lessons[l.id];
        return `<tr><td>${l.id}. ${KQ.escapeHtml(l.title)}</td><td class="stars-cell">${starString(r ? r.stars : 0)}</td><td>${r ? r.bestWpm : "–"}</td><td>${r ? r.bestAcc + "%" : "–"}</td><td>${r ? r.completed : 0}</td></tr>`;
      }).join("");

    const hist = p.history.slice(0, 15);
    $("progress-history").innerHTML = `<tr><th>When</th><th>Activity</th><th>WPM</th><th>Accuracy</th><th>Score</th></tr>` +
      (hist.length ? hist.map((h) => `<tr><td>${new Date(h.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td><td>${KQ.escapeHtml(h.label)}</td><td>${h.wpm ?? "–"}</td><td>${h.acc != null ? h.acc + "%" : "–"}</td><td>${h.score ?? "–"}</td></tr>`).join("")
        : `<tr><td colspan="5" class="muted">Nothing yet. Go type something!</td></tr>`);
  }

  function relativeDue(ts) {
    const ms = ts - Date.now();
    if (ms <= 0) return "now";
    const hours = Math.round(ms / 3600000);
    if (hours < 24) return hours <= 1 ? "within an hour" : `in ${hours}h`;
    const days = Math.round(hours / 24);
    return `in ${days} day${days === 1 ? "" : "s"}`;
  }

  // ---------- settings ----------
  const SETTING_IDS = { sound: "set-sound", stopOnError: "set-stop", showKeyboard: "set-keyboard", showHands: "set-hands", focusMode: "set-focus", unlockAll: "set-unlock" };
  function renderSettings() {
    const s = settings();
    for (const [k, id] of Object.entries(SETTING_IDS)) $(id).checked = !!s[k];
    const sel = $("set-level");
    sel.innerHTML = Object.entries(KQ.LEVELS).map(([k, v]) => `<option value="${k}">${KQ.escapeHtml(v.label)} (${KQ.escapeHtml(v.ages)})</option>`).join("");
    sel.value = level();
    $("set-srs").value = settings().srsMode || "adaptive";
    applyFocusMode();
  }
  for (const [k, id] of Object.entries(SETTING_IDS)) {
    $(id).addEventListener("change", (e) => {
      settings()[k] = e.target.checked;
      if (k === "sound") { KQ.audio.enabled = e.target.checked; updateChip(); }
      if (k === "focusMode") applyFocusMode();
      store.save();
    });
  }
  $("set-level").addEventListener("change", (e) => { settings().level = e.target.value; store.save(); });
  $("set-srs").addEventListener("change", (e) => {
    settings().srsMode = e.target.value === "ladder" ? "ladder" : "adaptive";
    store.save();
  });
  $("btn-export").addEventListener("click", () => {
    const blob = new Blob([store.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `keyquest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("btn-import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      store.importJson(await file.text());
      state.profile = store.current();
      e.target.value = "";
      if (state.profile) { updateChip(); go("home"); } else go("profiles");
    } catch (err) {
      alert("Sorry, that file doesn't look like a KeyQuest backup.");
    }
  });
  $("btn-delete-profile").addEventListener("click", () => {
    if (!confirm(`Delete ${state.profile.name} and all their progress?`)) return;
    store.deleteProfile(state.profile.id);
    state.profile = null;
    go("profiles");
  });
  $("btn-reset-all").addEventListener("click", () => {
    if (!confirm("Erase ALL typists and progress? This cannot be undone.")) return;
    store.resetAll();
    state.profile = null;
    go("profiles");
  });

  // ---------- global key routing ----------
  // Caps Lock turns every letter into a mistake, so warn loudly while typing.
  function checkCapsLock(e) {
    if (typeof e.getModifierState !== "function") return;
    const typing = state.screen === "practice" || GAME_SCREENS.includes(state.screen);
    $("capslock").hidden = !(typing && e.getModifierState("CapsLock"));
  }
  document.addEventListener("keydown", (e) => {
    checkCapsLock(e);
    if (state.screen === "practice") onPracticeKey(e);
    else if (GAME_SCREENS.includes(state.screen)) onGameKey(e);
  });
  document.addEventListener("keyup", checkCapsLock);
  document.addEventListener("pointerdown", () => KQ.audio.ensure(), { once: true });
  document.addEventListener("keydown", () => KQ.audio.ensure(), { once: true });

  async function loadVersion() {
    try {
      const res = await fetch("version.json", {cache:"no-store"});
      if (!res.ok) throw new Error("version unavailable");
      const v = await res.json();
      const label = "v" + v.version;
      $("app-version").textContent = label;
      $("settings-version").textContent = label;
      $("settings-version-name").textContent = v.name || "";
    } catch (_) {
      $("app-version").textContent = "";
      $("settings-version").textContent = "version unavailable";
    }
  }

  // ---------- boot ----------
  store.load();
  loadVersion();
  state.profile = store.current();
  if (state.profile) {
    KQ.audio.enabled = settings().sound;
    updateChip();
    go("home");
  } else {
    go("profiles");
  }
})();
