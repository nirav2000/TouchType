// Local persistence: profiles, settings and progress live in localStorage.
window.KQ = window.KQ || {};

const STORAGE_KEY = "touchtype:v1";
const LEGACY_STORAGE_KEY = "keyquest:v1";

KQ.MASTERY_STARS = 2;

KQ.DEFAULT_SETTINGS = {
  sound: true,
  stopOnError: true,
  unlockAll: false,
  showKeyboard: true,
  showHands: true,
  focusMode: false,
  srsMode: "adaptive",
  level: "kid",
};

function ensureAdaptive(profile) {
  profile.keyStats = profile.keyStats || {};
  profile.transitionStats = profile.transitionStats || {};
  profile.wordSkills = profile.wordSkills || {};
  profile.drillRecords = profile.drillRecords || [];
  profile.adaptiveStage = Number(profile.adaptiveStage || 0);
  return profile;
}

function reviewDelayDays(stage) {
  return [0, 1, 3, 7, 14, 30][Math.max(0, Math.min(5, stage))];
}

function adaptiveDelayDays(cur, sample, now) {
  const lastSeen = cur.lastSeen ? new Date(cur.lastSeen).getTime() : null;
  const elapsedDays = lastSeen ? Math.max(0, (now - lastSeen) / 86400000) : 0;
  const avgMs = sample.samples ? sample.totalMs / sample.samples : Infinity;
  const clean = (sample.errors || 0) === 0;
  const fast = avgMs <= Math.max(1100, sample.wordLength * 420);
  const adequate = avgMs <= Math.max(1800, sample.wordLength * 650);

  cur.retention = Number.isFinite(cur.retention) ? cur.retention : 0.55;
  cur.stabilityDays = Number.isFinite(cur.stabilityDays) ? cur.stabilityDays : 1;

  const dueWasRespected = !lastSeen || elapsedDays >= Math.max(0.5, cur.stabilityDays * 0.7);
  if (clean && fast && dueWasRespected) {
    cur.retention = Math.min(0.99, cur.retention + 0.09);
    cur.stabilityDays = Math.min(90, Math.max(1, cur.stabilityDays * (1.45 + cur.retention * 0.7)));
  } else if (clean && adequate) {
    cur.retention = Math.min(0.97, cur.retention + (dueWasRespected ? 0.05 : 0.015));
    cur.stabilityDays = Math.min(60, Math.max(1, cur.stabilityDays * (dueWasRespected ? 1.25 : 1.05)));
  } else {
    cur.retention = Math.max(0.2, cur.retention - 0.16);
    cur.stabilityDays = Math.max(0.5, cur.stabilityDays * 0.55);
  }

  const targetRecall = 0.9;
  const recallFactor = Math.max(0.55, Math.min(1.5, cur.retention / targetRecall));
  return Math.max(0.5, Math.min(90, cur.stabilityDays * recallFactor));
}

KQ.store = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      this.data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      this.data = null;
    }
    if (!this.data || !Array.isArray(this.data.profiles)) {
      this.data = { profiles: [], currentId: null };
    }
    this.data.profiles.forEach(ensureAdaptive);
    return this.data;
  },

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ }
  },

  profiles() { return this.data.profiles; },

  current() {
    const p = this.data.profiles.find((x) => x.id === this.data.currentId) || null;
    return p ? ensureAdaptive(p) : null;
  },

  setCurrent(id) { this.data.currentId = id; this.save(); },

  createProfile(name, avatar, level) {
    const profile = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim().slice(0, 20) || "Typist",
      avatar,
      created: new Date().toISOString(),
      settings: Object.assign({}, KQ.DEFAULT_SETTINGS, { level: level || "kid" }),
      lessons: {},
      keyStats: {},
      transitionStats: {},
      wordSkills: {},
      drillRecords: [],
      adaptiveStage: 0,
      history: [],
      bests: { rain: 0, race: 0, bubbles: 0 },
    };
    this.data.profiles.push(profile);
    this.data.currentId = profile.id;
    this.save();
    return profile;
  },

  deleteProfile(id) {
    this.data.profiles = this.data.profiles.filter((p) => p.id !== id);
    if (this.data.currentId === id) this.data.currentId = this.data.profiles[0]?.id || null;
    this.save();
  },

  settings(profile) {
    profile.settings = Object.assign({}, KQ.DEFAULT_SETTINGS, profile.settings || {});
    return profile.settings;
  },

  mergeKeyStats(profile, keyStats) {
    ensureAdaptive(profile);
    for (const [ch, s] of Object.entries(keyStats)) {
      const cur = (profile.keyStats[ch] = profile.keyStats[ch] || {
        attempts: 0, errors: 0, totalLatencyMs: 0, samples: 0, slow: 0,
      });
      cur.attempts += s.attempts || 0;
      cur.errors += s.errors || 0;
      cur.totalLatencyMs = (cur.totalLatencyMs || 0) + (s.totalLatencyMs || 0);
      cur.samples = (cur.samples || 0) + (s.samples || 0);
      cur.slow = (cur.slow || 0) + (s.slow || 0);
    }
    this.save();
  },

  mergeTransitionStats(profile, transitionStats) {
    ensureAdaptive(profile);
    for (const [pair, s] of Object.entries(transitionStats || {})) {
      const cur = (profile.transitionStats[pair] = profile.transitionStats[pair] || {
        attempts: 0, errors: 0, totalLatencyMs: 0, samples: 0,
      });
      cur.attempts += s.attempts || 0;
      cur.errors += s.errors || 0;
      cur.totalLatencyMs += s.totalLatencyMs || 0;
      cur.samples += s.samples || 0;
    }
    this.save();
  },

  mergeWordStats(profile, wordStats) {
    ensureAdaptive(profile);
    const now = Date.now();
    const mode = this.settings(profile).srsMode || "adaptive";
    for (const [word, s] of Object.entries(wordStats || {})) {
      if (!s.samples) continue;
      const cur = (profile.wordSkills[word] = profile.wordSkills[word] || {
        attempts: 0, errors: 0, totalMs: 0, samples: 0, bestMs: null,
        stage: 0, due: now, lastSeen: null, retention: 0.55, stabilityDays: 1,
      });
      const previousLastSeen = cur.lastSeen;
      cur.attempts += s.attempts || 0;
      cur.errors += s.errors || 0;
      cur.totalMs += s.totalMs || 0;
      cur.samples += s.samples || 0;
      cur.bestMs = cur.bestMs == null ? s.bestMs : Math.min(cur.bestMs, s.bestMs == null ? cur.bestMs : s.bestMs);

      const avgMs = s.samples ? s.totalMs / s.samples : Infinity;
      const clean = (s.errors || 0) === 0;
      const fluent = clean && avgMs <= Math.max(1100, word.length * 420);
      const adequate = clean && avgMs <= Math.max(1800, word.length * 650);

      if (fluent) cur.stage = Math.min(5, (cur.stage || 0) + 1);
      else if (!adequate || (s.errors || 0) > 0) cur.stage = Math.max(0, (cur.stage || 0) - 1);

      let delay;
      if (mode === "ladder") {
        delay = reviewDelayDays(cur.stage || 0);
      } else {
        cur.lastSeen = previousLastSeen;
        delay = adaptiveDelayDays(cur, {...s, wordLength:word.length}, now);
      }
      cur.lastIntervalDays = delay;
      cur.scheduler = mode;
      cur.lastSeen = new Date(now).toISOString();
      cur.due = now + delay * 86400000;
    }
    this.save();
  },

  recordAdaptiveSession(profile, session) {
    this.mergeKeyStats(profile, session.keyStats);
    this.mergeTransitionStats(profile, session.transitionStats);
    this.mergeWordStats(profile, session.wordStats);
  },

  dueWords(profile, allowed, n = 8) {
    ensureAdaptive(profile);
    const now = Date.now();
    const fits = (w) => [...w].every((c) => allowed.has(c));
    return Object.entries(profile.wordSkills)
      .filter(([w]) => fits(w))
      .map(([word, s]) => ({
        word,
        due: s.due || 0,
        stage: s.stage || 0,
        errorRate: s.attempts ? s.errors / s.attempts : 0,
        avgMs: s.samples ? s.totalMs / s.samples : Infinity,
      }))
      .filter((x) => x.due <= now || x.errorRate > 0.08)
      .sort((a, b) => (a.stage - b.stage) || (b.errorRate - a.errorRate) || (a.due - b.due))
      .slice(0, n)
      .map((x) => x.word);
  },


  recordDrill(profile, record) {
    ensureAdaptive(profile);
    const row = Object.assign({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
    }, record || {});
    profile.drillRecords.unshift(row);
    if (profile.drillRecords.length > 1000) profile.drillRecords.length = 1000;
    this.save();
    return row;
  },

  learningSnapshot(profile) {
    ensureAdaptive(profile);
    const now = Date.now();
    const words = Object.entries(profile.wordSkills);
    const masteredWords = words.filter(([,s]) => (s.stage || 0) >= 2).length;
    const learningWords = words.filter(([,s]) => (s.stage || 0) < 2).length;
    const due = words
      .filter(([,s]) => (s.due || 0) <= now)
      .sort((a,b) => (a[1].due || 0) - (b[1].due || 0));
    const upcoming = words
      .filter(([,s]) => (s.due || 0) > now)
      .sort((a,b) => (a[1].due || 0) - (b[1].due || 0));
    const adaptive = profile.history.filter((h) => h.type === "adaptive");
    const drills = profile.drillRecords || [];
    const totalSeconds = drills.reduce((a,d) => a + (d.seconds || 0), 0);
    return {
      masteredWords,
      learningWords,
      dueNow: due.length,
      nextDueAt: upcoming[0]?.[1]?.due || null,
      totalDrills: drills.length,
      adaptiveSessions: adaptive.length,
      totalMinutes: Math.round(totalSeconds / 60),
      upcoming: upcoming.slice(0, 12).map(([word,s]) => ({word, due:s.due, stage:s.stage || 0})),
      dueWords: due.slice(0, 12).map(([word,s]) => ({word, due:s.due, stage:s.stage || 0})),
    };
  },

  continuationAdvice(profile) {
    ensureAdaptive(profile);
    const now = Date.now();
    const recent = profile.history
      .filter((h) => h.type === "adaptive" && now - new Date(h.date).getTime() <= 60 * 60 * 1000)
      .slice(0, 4);
    if (!recent.length) return { stop:false, reason:"", label:"Continue practice" };
    const minutes = recent.reduce((a,h) => a + (h.seconds || 0), 0) / 60;
    if (recent.length < 2) {
      return {
        stop:false,
        reason:"A second short block can still be useful if concentration feels good.",
        label:"Continue practice",
      };
    }
    const cur = recent[0], prev = recent[1];
    const accGain = (cur.acc ?? 0) - (prev.acc ?? 0);
    const latencyGain = (prev.latency ?? 0) - (cur.latency ?? 0);
    const hesitationGain = (prev.hesitation ?? 0) - (cur.hesitation ?? 0);
    const strong = (cur.acc ?? 0) >= 97 && (cur.hesitation ?? 100) <= 10;
    const flat = accGain <= 1 && latencyGain <= 50 && hesitationGain <= 2;
    const stop = minutes >= 12 || (recent.length >= 2 && flat && strong) || recent.length >= 3;
    return stop ? {
      stop:true,
      reason:"More repetitions right now are showing little extra benefit. A break will make the next check more informative.",
      label:"Practice more anyway",
      breakMinutes:30,
      evidence:{minutes:Math.round(minutes),accGain,latencyGain,hesitationGain},
    } : {
      stop:false,
      reason:"There is still measurable room to improve in this sitting.",
      label:"Continue practice",
      evidence:{minutes:Math.round(minutes),accGain,latencyGain,hesitationGain},
    };
  },

  addHistory(profile, entry) {
    profile.history.unshift(Object.assign({ date: new Date().toISOString() }, entry));
    if (profile.history.length > 200) profile.history.length = 200;
  },

  recordLesson(profile, lesson, result) {
    const cur = profile.lessons[lesson.id] || { stars: 0, bestWpm: 0, bestAcc: 0, completed: 0 };
    cur.stars = Math.max(cur.stars, result.stars);
    cur.bestWpm = Math.max(cur.bestWpm, result.wpm);
    cur.bestAcc = Math.max(cur.bestAcc, result.accuracy);
    cur.completed += 1;
    profile.lessons[lesson.id] = cur;
    this.addHistory(profile, {
      type: "lesson", label: lesson.title, wpm: result.wpm, acc: result.accuracy,
      errors: result.errors, seconds: result.seconds,
      latency: result.avgLatencyMs ?? null, hesitation: result.hesitationRate ?? null,
    });
    this.save();
  },

  mastered(profile, lesson) {
    const rec = profile.lessons[lesson.id];
    return !!rec && rec.stars >= (lesson.kind === "intro" ? 1 : KQ.MASTERY_STARS);
  },

  unlockedIndex(profile) {
    if (this.settings(profile).unlockAll) return KQ.LESSONS.length - 1;
    let idx = 0;
    for (const lesson of KQ.LESSONS) {
      if (this.mastered(profile, lesson)) idx = Math.min(lesson.index + 1, KQ.LESSONS.length - 1);
      else break;
    }
    return idx;
  },

  allowedKeys(profile) {
    return KQ.LESSONS[this.unlockedIndex(profile)].allowed;
  },

  exportJson() { return JSON.stringify(this.data, null, 2); },

  importJson(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.profiles)) throw new Error("Not a TouchType backup file");
    parsed.profiles.forEach(ensureAdaptive);
    this.data = parsed;
    this.save();
  },

  resetAll() {
    this.data = { profiles: [], currentId: null };
    this.save();
  },
};
