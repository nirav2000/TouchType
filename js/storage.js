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
  level: "kid",
};

function ensureAdaptive(profile) {
  profile.keyStats = profile.keyStats || {};
  profile.transitionStats = profile.transitionStats || {};
  profile.wordSkills = profile.wordSkills || {};
  return profile;
}

function reviewDelayDays(stage) {
  return [0, 1, 3, 7, 14, 30][Math.max(0, Math.min(5, stage))];
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
    for (const [word, s] of Object.entries(wordStats || {})) {
      if (!s.samples) continue;
      const cur = (profile.wordSkills[word] = profile.wordSkills[word] || {
        attempts: 0, errors: 0, totalMs: 0, samples: 0, bestMs: null,
        stage: 0, due: now, lastSeen: null,
      });
      cur.attempts += s.attempts || 0;
      cur.errors += s.errors || 0;
      cur.totalMs += s.totalMs || 0;
      cur.samples += s.samples || 0;
      cur.bestMs = cur.bestMs == null ? s.bestMs : Math.min(cur.bestMs, s.bestMs == null ? cur.bestMs : s.bestMs);
      cur.lastSeen = new Date(now).toISOString();

      const avgMs = s.samples ? s.totalMs / s.samples : Infinity;
      const clean = (s.errors || 0) === 0;
      const fluent = clean && avgMs <= Math.max(1100, word.length * 420);
      const adequate = clean && avgMs <= Math.max(1800, word.length * 650);

      if (fluent) cur.stage = Math.min(5, (cur.stage || 0) + 1);
      else if (!adequate || (s.errors || 0) > 0) cur.stage = Math.max(0, (cur.stage || 0) - 1);

      const delay = reviewDelayDays(cur.stage || 0);
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
