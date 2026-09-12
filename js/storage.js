// Local persistence: profiles, settings and progress live in localStorage.
window.KQ = window.KQ || {};

const STORAGE_KEY = "keyquest:v1";

KQ.MASTERY_STARS = 2;

KQ.DEFAULT_SETTINGS = {
  sound: true,
  stopOnError: true,
  unlockAll: false,
  showKeyboard: true,
  showHands: true,
  level: "kid",
};

KQ.store = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      this.data = null;
    }
    if (!this.data || !Array.isArray(this.data.profiles)) {
      this.data = { profiles: [], currentId: null };
    }
    return this.data;
  },

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ }
  },

  profiles() { return this.data.profiles; },

  current() {
    return this.data.profiles.find((p) => p.id === this.data.currentId) || null;
  },

  setCurrent(id) { this.data.currentId = id; this.save(); },

  createProfile(name, avatar, level) {
    const profile = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim().slice(0, 20) || "Typist",
      avatar,
      created: new Date().toISOString(),
      settings: Object.assign({}, KQ.DEFAULT_SETTINGS, { level: level || "kid" }),
      lessons: {},      // lessonId -> { stars, bestWpm, bestAcc, completed }
      keyStats: {},     // char -> { attempts, errors }
      history: [],      // { date, type, label, wpm, acc, errors, seconds }
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
    for (const [ch, s] of Object.entries(keyStats)) {
      const cur = (profile.keyStats[ch] = profile.keyStats[ch] || { attempts: 0, errors: 0 });
      cur.attempts += s.attempts;
      cur.errors += s.errors;
    }
    this.save();
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
    this.addHistory(profile, { type: "lesson", label: lesson.title, wpm: result.wpm, acc: result.accuracy, errors: result.errors, seconds: result.seconds });
    this.save();
  },

  // A lesson is mastered with two stars (or any pass of the intro lesson).
  mastered(profile, lesson) {
    const rec = profile.lessons[lesson.id];
    return !!rec && rec.stars >= (lesson.kind === "intro" ? 1 : KQ.MASTERY_STARS);
  },

  // Highest lesson index the profile may open.
  unlockedIndex(profile) {
    if (this.settings(profile).unlockAll) return KQ.LESSONS.length - 1;
    let idx = 0;
    for (const lesson of KQ.LESSONS) {
      if (this.mastered(profile, lesson)) idx = Math.min(lesson.index + 1, KQ.LESSONS.length - 1);
      else break;
    }
    return idx;
  },

  // Keys the learner has been taught so far.
  allowedKeys(profile) {
    return KQ.LESSONS[this.unlockedIndex(profile)].allowed;
  },

  exportJson() { return JSON.stringify(this.data, null, 2); },

  importJson(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.profiles)) throw new Error("Not a KeyQuest backup file");
    this.data = parsed;
    this.save();
  },

  resetAll() {
    this.data = { profiles: [], currentId: null };
    this.save();
  },
};
