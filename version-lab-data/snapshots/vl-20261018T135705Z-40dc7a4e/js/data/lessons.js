// Curriculum definition and exercise generation.
// Lessons introduce keys outward from the home row, then shift, numbers and punctuation.
// Every exercise is generated fresh from the corpus using only keys the learner has met.
window.KQ = window.KQ || {};

KQ.FINGER_NAMES = {
  lp: "left pinky", lr: "left ring finger", lm: "left middle finger", li: "left index finger",
  ri: "right index finger", rm: "right middle finger", rr: "right ring finger", rp: "right pinky",
  th: "thumb",
};

// Which finger presses each (unshifted) key on a QWERTY keyboard.
KQ.FINGERS = {
  "`": "lp", "1": "lp", "2": "lr", "3": "lm", "4": "li", "5": "li", "6": "ri", "7": "ri", "8": "rm", "9": "rr", "0": "rp", "-": "rp", "=": "rp",
  q: "lp", w: "lr", e: "lm", r: "li", t: "li", y: "ri", u: "ri", i: "rm", o: "rr", p: "rp", "[": "rp", "]": "rp", "\\": "rp",
  a: "lp", s: "lr", d: "lm", f: "li", g: "li", h: "ri", j: "ri", k: "rm", l: "rr", ";": "rp", "'": "rp",
  z: "lp", x: "lr", c: "lm", v: "li", b: "li", n: "ri", m: "ri", ",": "rm", ".": "rr", "/": "rp",
  " ": "th",
};

// Shifted character -> base key.
KQ.SHIFTED = {
  "~": "`", "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", "_": "-", "+": "=",
  "{": "[", "}": "]", "|": "\\", ":": ";", "\"": "'", "<": ",", ">": ".", "?": "/",
};

KQ.keyFor = function (ch) {
  if (ch >= "A" && ch <= "Z") return { key: ch.toLowerCase(), shift: true };
  if (KQ.SHIFTED[ch]) return { key: KQ.SHIFTED[ch], shift: true };
  return { key: ch, shift: false };
};
KQ.fingerFor = function (ch) { return KQ.FINGERS[KQ.keyFor(ch).key] || null; };
KQ.handFor = function (ch) { const f = KQ.fingerFor(ch); return f && f !== "th" ? f[0] : null; };

// Skill levels scale speed targets, exercise length and game speed.
KQ.LEVELS = {
  little: { label: "Little kid", ages: "5 to 7", wpm: 0.6, length: 0.7, speed: 0.75 },
  kid:    { label: "Kid",        ages: "8 to 10", wpm: 1.0, length: 1.0, speed: 1.0 },
  big:    { label: "Big kid",    ages: "11 and up", wpm: 1.4, length: 1.25, speed: 1.25 },
};
KQ.levelInfo = (level) => KQ.LEVELS[level] || KQ.LEVELS.kid;

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

KQ.POSTURE_TIPS = [
  ["🪑", "Sit up straight with your feet flat on the floor."],
  ["💪", "Keep your elbows by your sides and your wrists floating, not resting."],
  ["👀", "Eyes on the screen, not on your hands. The keyboard on screen will help you."],
  ["🤚", "Left fingers rest on A S D F. Right fingers rest on J K L ;."],
  ["👍", "Feel the little bumps on F and J. That is how you find home without looking."],
  ["👆", "Thumbs hover over the space bar."],
];

// Raw lesson list. `keys` are the NEW characters introduced by the lesson.
const RAW_LESSONS = [
  { id: 0,  unit: 0, title: "Getting Ready",         keys: "",    kind: "intro",   own: "fjasdkl; ", tip: "Before we type, let's get set up. Read the tips, then find your home keys." },
  { id: 1,  unit: 0, title: "Meet F and J",          keys: "fj",  kind: "keys",    tip: "Rest your fingers on the home row. Feel the little bumps on F and J? Your index fingers live there." },
  { id: 2,  unit: 0, title: "D and K",               keys: "dk",  kind: "keys",    tip: "Your middle fingers rest on D and K. Keep your other fingers on their home keys." },
  { id: 3,  unit: 0, title: "S and L",               keys: "sl",  kind: "keys",    tip: "Ring fingers on S and L. Try not to look down at your hands!" },
  { id: 4,  unit: 0, title: "A and ;",               keys: "a;",  kind: "keys",    tip: "Pinkies on A and semicolon. Pinkies are small but mighty." },
  { id: 5,  unit: 0, title: "Home Row Test",         keys: "",    kind: "review",  tip: "You know the whole home row! Warm up, then pass the test to unlock the top row." },
  { id: 6,  unit: 1, title: "G and H",               keys: "gh",  kind: "keys",    tip: "Stretch your index fingers inward to reach G and H, then come straight back to F and J. We will make these reaches automatic before moving up a row." },
  { id: 7,  unit: 1, title: "E and I",               keys: "ei",  kind: "keys",    tip: "Middle fingers reach up for E and I, then bounce straight back home. These letters unlock many more real words and sentences." },
  { id: 8,  unit: 1, title: "R and U",               keys: "ru",  kind: "keys",    tip: "Index fingers reach up for R and U." },
  { id: 9,  unit: 1, title: "T and Y",               keys: "ty",  kind: "keys",    tip: "Index fingers stretch up and inward for T and Y." },
  { id: 10, unit: 1, title: "W and O",               keys: "wo",  kind: "keys",    tip: "Ring fingers reach up for W and O." },
  { id: 11, unit: 1, title: "Q and P",               keys: "qp",  kind: "keys",    tip: "Pinkies reach up for Q and P. That is the whole top row!" },
  { id: 12, unit: 1, title: "Top Row Test",          keys: "",    kind: "review",  tip: "Home row plus top row. Pass the test to unlock the bottom row." },
  { id: 13, unit: 2, title: "V and M",               keys: "vm",  kind: "keys",    tip: "Index fingers reach down for V and M." },
  { id: 14, unit: 2, title: "C and ,",               keys: "c,",  kind: "keys",    tip: "Middle fingers reach down for C and comma." },
  { id: 15, unit: 2, title: "X and .",               keys: "x.",  kind: "keys",    tip: "Ring fingers reach down for X and period. Now you can end a sentence." },
  { id: 16, unit: 2, title: "Z and /",               keys: "z/",  kind: "keys",    tip: "Pinkies reach down for Z and slash." },
  { id: 17, unit: 2, title: "B and N",               keys: "bn",  kind: "keys",    tip: "Index fingers stretch down and inward for B and N. That's every letter!" },
  { id: 18, unit: 2, title: "All Letters Test",      keys: "",    kind: "review",  tip: "Every letter on the keyboard. Pass the test to unlock capitals and numbers." },
  { id: 19, unit: 3, title: "Capital Letters",       keys: "",    kind: "shift",   tip: "Hold Shift with the OPPOSITE pinky, then press the letter. Left letter? Right Shift. Right letter? Left Shift." },
  { id: 20, unit: 3, title: "Numbers 1 to 5",        keys: "12345", kind: "numbers", tip: "Reach way up to the number row with your left hand, then come back home." },
  { id: 21, unit: 3, title: "Numbers 6 to 0",        keys: "67890", kind: "numbers", tip: "Now the right hand reaches up for 6 through 0." },
  { id: 22, unit: 3, title: "Punctuation",           keys: "'\"?!-", kind: "punct", tip: "Apostrophes, quotes, question marks and exclamation points. Most need Shift!" },
  { id: 23, unit: 4, title: "Stories",               keys: "",    kind: "story",   tip: "Real paragraphs. Keep a steady rhythm and don't rush." },
];

KQ.UNITS = [
  { title: "Home Row", icon: "🏠" },
  { title: "Top Row", icon: "⬆️" },
  { title: "Bottom Row", icon: "⬇️" },
  { title: "Capitals, Numbers and Punctuation", icon: "🔢" },
  { title: "Stories", icon: "📖" },
];

// Base words-per-minute target by unit, before skill-level scaling.
const UNIT_WPM = [8, 12, 16, 20, 24];
// Base exercise length (characters) by unit.
const UNIT_LEN = [60, 85, 105, 125, 0];

(function buildLessons() {
  const allowed = new Set([" "]);
  KQ.LESSONS = RAW_LESSONS.map((raw, idx) => {
    for (const ch of raw.keys) allowed.add(ch);
    if (raw.kind === "shift") for (const ch of LETTERS) allowed.add(ch.toUpperCase());
    return Object.assign({}, raw, {
      index: idx,
      newKeys: raw.kind === "shift" ? ["Shift"] : raw.keys.split(""),
      allowed: raw.own ? new Set(raw.own) : new Set(allowed),
      baseWpm: UNIT_WPM[raw.unit],
      baseLen: UNIT_LEN[raw.unit],
      isTest: raw.kind === "review",
    });
  });
})();

KQ.targetWpm = (lesson, level) => Math.max(5, Math.round(lesson.baseWpm * KQ.levelInfo(level).wpm));

// Adaptive TouchType curriculum. This is the primary learning path; the original
// KeyQuest lessons remain available as optional structured practice.
KQ.ADAPTIVE_STAGES = [
  { id: "home-gh", title: "Home row fluency + G/H", newKeys: "gh", allowed: "asdfghjkl; ", note: "Keep A S D F and J K L ; anchored. Reach to G/H and come straight home." },
  { id: "ei", title: "Add E and I", newKeys: "ei", allowed: "asdfghjkl; ei", note: "Middle fingers reach up to E/I, then return home." },
  { id: "ru", title: "Add R and U", newKeys: "ru", allowed: "asdfghjkl; eiru", note: "Index fingers reach up to R/U without moving the whole hand." },
  { id: "ty", title: "Add T and Y", newKeys: "ty", allowed: "asdfghjkl; eiruty", note: "Stretch inward to T/Y, then re-anchor on F/J." },
  { id: "wo", title: "Add W and O", newKeys: "wo", allowed: "asdfghjkl; eirutywo", note: "Ring fingers reach up to W/O." },
  { id: "nm", title: "Add N and M", newKeys: "nm", allowed: "asdfghjkl; eirutywonm", note: "Index fingers reach down to N/M and return home." },
  { id: "cv", title: "Add C and V", newKeys: "cv", allowed: "asdfghjkl; eirutywonmcv", note: "Middle/index fingers reach down to C/V." },
  { id: "b", title: "Add B", newKeys: "b", allowed: "asdfghjkl; eirutywonmcvb", note: "Reach B with the index finger while keeping the hand centred." },
  { id: "pq", title: "Add P and Q", newKeys: "pq", allowed: "asdfghjkl; eirutywonmcvbpq", note: "Pinkies reach up to P/Q, then return to home." },
  { id: "xz", title: "Add X and Z", newKeys: "xz", allowed: "abcdefghijklmnopqrstuvwxyz; ", note: "Finish the alphabet with X/Z while preserving rhythm." },
];

KQ.adaptiveStageFor = function(profile) {
  const index = Math.max(0, Math.min(KQ.ADAPTIVE_STAGES.length - 1, Number(profile?.adaptiveStage || 0)));
  const raw = KQ.ADAPTIVE_STAGES[index];
  return {...raw, index, allowedSet: new Set(raw.allowed)};
};

KQ.adaptiveStageStatus = function(profile) {
  const stage = KQ.adaptiveStageFor(profile);
  const keyDetails = [...stage.newKeys].map((ch) => {
    const s = profile?.keyStats?.[ch] || {};
    const accuracy = s.attempts ? ((s.attempts - (s.errors || 0)) / s.attempts) * 100 : 0;
    const latency = s.samples ? (s.totalLatencyMs || 0) / s.samples : Infinity;
    const hesitation = s.samples ? ((s.slow || 0) / s.samples) * 100 : 100;
    return {ch, attempts:s.attempts || 0, accuracy, latency, hesitation};
  });
  const stageWords = Object.entries(profile?.wordSkills || {}).filter(([word]) =>
    [...word].every((ch) => stage.allowedSet.has(ch)) &&
    [...stage.newKeys].some((ch) => word.includes(ch))
  );
  const masteredWords = stageWords.filter(([,s]) => (s.stage || 0) >= 2).length;
  const keysReady = keyDetails.every((k) => k.attempts >= 20 && k.accuracy >= 95 && k.latency <= 900 && k.hesitation <= 15);
  return {
    stage,
    keyDetails,
    masteredWords,
    ready: keysReady && masteredWords >= 5,
    wordGoal: 5,
  };
};


// ---------- helpers ----------
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const fitsAllowed = (text, allowed) => [...text].every((c) => allowed.has(c));
const lettersOnly = (allowed) => [...allowed].filter((c) => /[a-z]/.test(c));
const typeable = (allowed) => [...allowed].filter((c) => c !== " ");

// Join items with spaces until roughly maxLen characters, cycling if needed.
function joinToLength(items, maxLen) {
  if (!items.length) return "";
  const out = [];
  let len = 0, i = 0, guard = 0;
  while (guard++ < 400) {
    const it = items[i % items.length];
    if (len + it.length + (out.length ? 1 : 0) > maxLen) { if (out.length) break; }
    out.push(it);
    len += it.length + (out.length > 1 ? 1 : 0);
    i++;
    if (len >= maxLen) break;
  }
  return out.join(" ");
}

const wordsFor = (allowed) => KQ.WORDS.filter((w) => fitsAllowed(w, allowed));

// Sentences adapted to what the learner knows: lowercase before Shift,
// punctuation stripped before it is learned. Apostrophes can't be stripped
// without mangling the word, so those sentences wait.
function sentencesFor(allowed, opts = {}) {
  const hasShift = allowed.has("A");
  const out = [];
  for (let s of KQ.SENTENCES) {
    if (!hasShift) s = s.toLowerCase();
    if (s.includes("'") && !allowed.has("'")) continue;
    s = [...s].filter((c) => allowed.has(c) || !/[.,"!?:;-]/.test(c)).join("").replace(/\s+/g, " ").trim();
    if (!s || !fitsAllowed(s, allowed)) continue;
    if (opts.needsAny && ![...opts.needsAny].some((c) => s.includes(c))) continue;
    out.push(s);
  }
  return out;
}

// Random pseudo-words from a pool of letters, each containing at least one "must" letter.
function letterGroups(pool, must, count, minLen = 2, maxLen = 4) {
  const groups = [];
  for (let i = 0; i < count; i++) {
    const len = minLen + rand(maxLen - minLen + 1);
    let g = "";
    for (let k = 0; k < len; k++) g += pick(pool);
    if (must.length && ![...g].some((c) => must.includes(c))) {
      const at = rand(len);
      g = g.slice(0, at) + pick(must) + g.slice(at + 1);
    }
    groups.push(g);
  }
  return groups;
}

// Alternating-hand groups (left, right, left...) which build rhythm.
function rhythmGroups(allowed, must, count) {
  const pool = typeable(allowed).filter((c) => /[a-z]/.test(c) || must.includes(c));
  const left = pool.filter((c) => KQ.handFor(c) === "l");
  const right = pool.filter((c) => KQ.handFor(c) === "r");
  if (!left.length || !right.length) return letterGroups(typeable(allowed), must, count, 2, 4);
  const groups = [];
  for (let i = 0; i < count; i++) {
    const len = 2 + rand(3);
    let side = rand(2);
    let g = "";
    for (let k = 0; k < len; k++) { g += pick(side ? right : left); side = 1 - side; }
    if (must.length && ![...g].some((c) => must.includes(c))) {
      const m = pick(must);
      const at = [...g].findIndex((c) => KQ.handFor(c) === KQ.handFor(m));
      g = at >= 0 ? g.slice(0, at) + m + g.slice(at + 1) : m + g.slice(1);
    }
    groups.push(g);
  }
  return groups;
}

// Common bigram/trigram drills: "th th the them".
function bigramItems(allowed, must, words) {
  const grams = KQ.BIGRAMS.concat(KQ.TRIGRAMS).filter((g) => fitsAllowed(g, allowed));
  const preferred = must.length ? grams.filter((g) => [...g].some((c) => must.includes(c))) : grams;
  const chosen = shuffle(preferred.length >= 4 ? preferred : grams).slice(0, 8);
  if (!chosen.length) return null;
  const items = [];
  for (const g of chosen) {
    items.push(g, g, g + g);
    const w = words.filter((x) => x.includes(g));
    if (w.length) items.push(pick(w));
  }
  return items;
}

// Two- and three-word chunks cut from sentences.
function phrases(sentences) {
  const out = [];
  for (const s of sentences) {
    const words = s.split(" ");
    for (let i = 0; i + 1 < words.length; i += 2 + rand(2)) out.push(words.slice(i, i + 2 + rand(2)).join(" "));
  }
  return shuffle(out);
}

// ---------- exercise builders ----------
// Each builder returns [{ name, text, test? }]. `len` is the per-exercise character budget.
function exNew(a, b, len) {
  const patterns = [a + a + a, b + b + b, a + b + a, b + a + b, a + a + b, b + b + a, a + b + b, b + a + a, a + b, b + a];
  let seq = [];
  while (seq.length < 30) seq = seq.concat(shuffle(patterns));
  return { name: `New keys: ${a.toUpperCase()} and ${b.toUpperCase()}`, text: joinToLength(seq, len) };
}
function exRhythm(allowed, must, len) {
  return { name: "Rhythm", text: joinToLength(rhythmGroups(allowed, must, 40), len) };
}
function exBigrams(allowed, must, words, len) {
  const items = bigramItems(allowed, must, words);
  if (!items) return { name: "Mix it up", text: joinToLength(letterGroups(typeable(allowed), must, 40, 2, 4), len) };
  return { name: "Letter pairs", text: joinToLength(shuffle(items), len) };
}
// Words containing the new letters. New punctuation keys get sprinkled onto words instead.
function decorate(words, punct) {
  if (!punct.length) return words;
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const p = punct[i % punct.length];
    if (p === "/" && i + 1 < words.length && i % 2 === 0) { out.push(words[i] + "/" + words[i + 1]); i++; }
    else out.push(i % 2 ? words[i] + p : words[i]);
  }
  return out;
}
function adaptiveWordPool(words, must, profile, allowed) {
  const letters = must.filter((ch) => /[a-z]/.test(ch));
  const due = profile && KQ.store ? KQ.store.dueWords(profile, allowed, 10) : [];
  const newWords = letters.length ? words.filter((w) => letters.some((ch) => w.includes(ch))) : words;
  const known = profile && profile.wordSkills ? profile.wordSkills : {};
  const unseen = newWords.filter((w) => !known[w]);
  const weak = newWords.filter((w) => {
    const s = known[w];
    return s && ((s.attempts && s.errors / s.attempts > 0.08) || (s.stage || 0) < 2);
  });
  return [...new Set(due.concat(weak, unseen, newWords))];
}

function exAcquire(words, must, allowed, len, profile) {
  const pool = adaptiveWordPool(words, must, profile, allowed);
  if (!pool.length) return exWords(words, must, allowed, len, "Word drill");
  const targetCount = Math.max(2, Math.min(5, Math.floor(len / 28)));
  const targets = pool.slice(0, targetCount);
  const repeated = [];
  for (const word of targets) for (let i = 0; i < 5; i++) repeated.push(word);
  return { name: "Make these automatic", text: repeated.join(" "), targets, acquisition: true };
}

function exAdaptiveSentences(sentences, words, allowed, must, len, profile) {
  const pool = adaptiveWordPool(words, must, profile, allowed).slice(0, 8);
  const focused = pool.length ? sentences.filter((s) => pool.some((w) => s.includes(w))) : [];
  return exSentences(focused.length ? focused : sentences, words, allowed, must, len, "Use them in sentences");
}

function exWords(words, must, allowed, len, name) {
  const letters = must.filter((c) => /[a-z]/.test(c));
  const punct = must.filter((c) => !/[a-z]/.test(c));
  let pool = letters.length ? words.filter((w) => letters.some((c) => w.includes(c))) : words;
  if (pool.length >= 4) {
    if (pool.length < 12) pool = shuffle(pool.concat(shuffle(words).slice(0, 12 - pool.length)));
    return { name: name || "Words", text: joinToLength(decorate(shuffle(pool).concat(shuffle(pool)), punct), len) };
  }
  return { name: "Letter groups", text: joinToLength(letterGroups(typeable(allowed), must, 40, 3, 5), len) };
}
function exLonger(words, allowed, must, len) {
  const long = words.filter((w) => w.length >= 4);
  if (long.length >= 6) return { name: "Longer words", text: joinToLength(shuffle(long).concat(shuffle(long)), len) };
  return exWords(words, must, allowed, len, "More words");
}
function exSentences(sentences, words, allowed, must, len, name) {
  if (sentences.length >= 5) return { name: name || "Sentences", text: joinToLength(shuffle(sentences), len) };
  const ph = phrases(sentences);
  if (ph.length >= 4) return { name: "Phrases", text: joinToLength(shuffle(ph.concat(shuffle(words).slice(0, 10))), len) };
  return exWords(words, must, allowed, len, "More words");
}

function buildIntro(lesson, len) {
  return [
    { name: "Find the bumps: F and J", text: joinToLength(["ffff", "jjjj"], Math.round(len * 0.6)) },
    { name: "Thumb on the space bar", text: joinToLength(["f", "j"], Math.round(len * 0.5)) },
    { name: "Home position: every finger", text: joinToLength(["asdf", "jkl;"], Math.round(len * 0.8)) },
  ];
}

function buildKeys(lesson, len, profile) {
  const [a, b] = lesson.newKeys;
  const must = [a, b];
  const words = wordsFor(lesson.allowed);
  const sentences = sentencesFor(lesson.allowed);
  const early = lesson.unit === 0;
  const realWords = words.filter((w) => w.length >= 2);
  const list = [
    exNew(a, b, Math.round(len * 0.55)),
    exRhythm(lesson.allowed, must, Math.round(len * 0.65)),
    exAcquire(realWords, must, lesson.allowed, Math.round(len * 1.15), profile),
    exAdaptiveSentences(sentences, realWords, lesson.allowed, must, Math.round(len * 1.25), profile),
    exWords(realWords, must, lesson.allowed, len, "Mixed words"),
  ];
  return early ? list.slice(0, 4) : list;
}

function buildReview(lesson, len) {
  const words = wordsFor(lesson.allowed);
  const sentences = sentencesFor(lesson.allowed);
  const testSource = sentences.length >= 3 ? shuffle(sentences) : shuffle(words).concat(shuffle(words));
  return [
    exRhythm(lesson.allowed, [], len),
    exBigrams(lesson.allowed, [], words, len),
    exWords(words, [], lesson.allowed, len),
    exSentences(sentences, words, lesson.allowed, [], len),
    { name: "Show what you know", text: joinToLength(testSource, Math.round(len * 1.6)), test: true },
  ];
}

function buildShift(lesson, len) {
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  const pairs = shuffle(LETTERS.split("")).map((c) => c.toUpperCase() + c);
  const words = wordsFor(lesson.allowed).filter((w) => w.length >= 3);
  const sentences = shuffle(sentencesFor(lesson.allowed));
  return [
    { name: "Shift pairs", text: joinToLength(pairs, len) },
    { name: "Capital words", text: joinToLength(shuffle(words).map(cap), len) },
    { name: "Names", text: joinToLength(shuffle(["Sam", "Zoe", "Max", "Mia", "Leo", "Ava", "Ben", "Emma", "Jack", "Lily", "Noah", "Ruby", "Kim", "Omar", "Tia", "Finn", "Ivy", "Eli"]).map((n) => n + (Math.random() < 0.5 ? "" : " and " + pick(["Sam", "Zoe", "Max", "Mia", "Leo"]))), len) },
    { name: "Sentences", text: joinToLength(sentences, Math.round(len * 1.2)) },
    { name: "More sentences", text: joinToLength(shuffle(sentences), Math.round(len * 1.2)) },
  ];
}

function buildNumbers(lesson, len) {
  const digits = lesson.keys.split("");
  const singles = shuffle(digits.concat(digits, digits, digits));
  const words = shuffle(wordsFor(lesson.allowed).filter((w) => w.length >= 3));
  const mixed = [];
  for (let i = 0; i < 30; i++) mixed.push(pick(digits) + (Math.random() < 0.3 ? pick(digits) : "") + " " + words[i % words.length]);
  const numeric = shuffle(sentencesFor(lesson.allowed, { needsAny: digits }));
  const other = shuffle(sentencesFor(lesson.allowed));
  return [
    { name: "Number row", text: joinToLength(singles, len) },
    { name: "Number groups", text: joinToLength(letterGroups(digits, [], 40, 2, 4), len) },
    { name: "Numbers and words", text: joinToLength(mixed, len) },
    { name: "Sentences with numbers", text: joinToLength(numeric.concat(other), Math.round(len * 1.2)) },
    { name: "Sentences", text: joinToLength(shuffle(numeric.concat(other.slice(0, 6))), Math.round(len * 1.2)) },
  ];
}

function buildPunct(lesson, len) {
  const contractions = ["it's", "don't", "can't", "I'm", "you're", "let's", "we'll", "isn't", "she's", "that's", "I'll", "didn't", "won't", "they're"];
  const bits = ["wow!", "yes!", "go!", "why?", "who?", "when?", "\"hi\"", "\"no\"", "\"yes\"", "sit-up", "ice-cream", "well-done", "ten-two", "\"stop!\""];
  const punct = shuffle(sentencesFor(lesson.allowed, { needsAny: lesson.keys }));
  return [
    { name: "Contractions", text: joinToLength(shuffle(contractions).concat(shuffle(contractions)), len) },
    { name: "Punctuation bits", text: joinToLength(shuffle(bits).concat(shuffle(bits)), len) },
    { name: "Sentences", text: joinToLength(punct, Math.round(len * 1.2)) },
    { name: "More sentences", text: joinToLength(shuffle(punct), Math.round(len * 1.2)) },
    { name: "Even more sentences", text: joinToLength(shuffle(punct), Math.round(len * 1.3)) },
  ];
}

function buildStory() {
  return shuffle(KQ.PARAGRAPHS).slice(0, 4).map((p, i) => ({ name: `Story ${i + 1}`, text: p }));
}

KQ.buildExercises = function (lesson, level, profile) {
  const len = Math.round(lesson.baseLen * KQ.levelInfo(level).length);
  switch (lesson.kind) {
    case "intro": return buildIntro(lesson, len);
    case "keys": return buildKeys(lesson, len, profile);
    case "review": return buildReview(lesson, len);
    case "shift": return buildShift(lesson, len);
    case "numbers": return buildNumbers(lesson, len);
    case "punct": return buildPunct(lesson, len);
    case "story": return buildStory(lesson, len);
  }
  return [];
};


KQ.buildAdaptivePlan = function(profile) {
  const stage = KQ.adaptiveStageFor(profile);
  const allowed = stage.allowedSet;
  const focusWords = wordsFor(allowed)
    .filter((w) => w.length >= 2 && [...stage.newKeys].some((ch) => w.includes(ch)));
  const due = KQ.store?.dueWords ? KQ.store.dueWords(profile, allowed, 12) : [];
  const skills = profile?.wordSkills || {};
  const unseen = focusWords.filter((w) => !skills[w]);
  const weak = focusWords.filter((w) => {
    const s = skills[w];
    return s && ((s.stage || 0) < 2 || (s.attempts && s.errors / s.attempts > 0.08));
  });
  const ordered = [...new Set(due.filter((w) => focusWords.includes(w)).concat(weak, unseen, focusWords))];
  const targets = ordered.slice(0, 4);
  const reps = {};
  for (const word of targets) {
    const s = skills[word];
    reps[word] = !s ? 5 : ((s.stage || 0) < 2 || (s.attempts && s.errors / s.attempts > 0.08)) ? 3 : 1;
  }
  const acquisition = [];
  for (const word of targets) for (let i=0;i<reps[word];i++) acquisition.push(word);

  const sentences = sentencesFor(allowed).filter((s) => targets.some((w) => s.includes(w)));
  const sentenceText = shuffle(sentences).slice(0, 4).join(" ");
  const mixedPool = [...new Set(targets.concat(due, focusWords))];
  const mixed = shuffle(mixedPool).slice(0, Math.min(14, mixedPool.length));

  const exercises = [
    {
      name: "Build the pattern",
      text: acquisition.join(" "),
      acquisition: true,
      targets,
      repetitions: reps,
    },
    {
      name: "Use it in real sentences",
      text: sentenceText || targets.join(" "),
      transfer: true,
      targets,
    },
    {
      name: "Mixed recall",
      text: mixed.join(" "),
      recall: true,
      targets,
    },
  ].filter((x) => x.text);

  return {
    stage,
    targets,
    repetitions: reps,
    dueCount: due.length,
    exercises,
    status: KQ.adaptiveStageStatus(profile),
  };
};

// Identical real-word checkpoint within each adaptive stage. This is intentionally
// separate from adaptive drills: changing word sets would invalidate a speed trend.
// Its word selection and order must stay fixed under the versioned benchmark ID.
KQ.buildBenchmark = function (profile) {
  const stage = KQ.adaptiveStageFor(profile);
  const all = wordsFor(stage.allowedSet).filter((w) => /^[a-z]{2,}$/.test(w)).sort();
  const focus = all.filter((w) => [...stage.newKeys].some((ch) => w.includes(ch)));
  const words = [...new Set(focus.slice(0, 8).concat(all.filter((w) => w.length >= 3).slice(0, 6), all))].slice(0, 12);
  // One full run of the same words at the same difficulty, with no random shuffling.
  // About 170-210 characters: enough for a usable WPM snapshot without a long test.
  const items = [];
  while (items.join(" ").length < 170 && items.length < 55 && words.length) {
    items.push(words[items.length % words.length]);
  }
  return {
    id: "familiar-" + stage.id + "-v1",
    stageId: stage.id,
    stageTitle: stage.title,
    words,
    text: items.join(" "),
  };
};

// ---------- weak-key practice ----------
// Keys the learner struggles with, limited to keys they have actually learned.
KQ.weakKeys = function (keyStats, allowed, n = 4) {
  return Object.entries(keyStats)
    .filter(([ch, s]) => ch !== " " && allowed.has(ch) && s.attempts >= 8)
    .map(([ch, s]) => ({ ch, accuracy: Math.round(((s.attempts - s.errors) / s.attempts) * 100), attempts: s.attempts }))
    .filter((k) => k.accuracy < 95)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, n);
};

KQ.buildWeakKeyExercises = function (weak, allowed, level) {
  const must = weak.map((k) => k.ch);
  const len = Math.round(95 * KQ.levelInfo(level).length);
  const words = wordsFor(allowed);
  const sentences = sentencesFor(allowed, { needsAny: must });
  const pool = typeable(allowed).concat(must, must, must);
  const label = must.map((c) => c.toUpperCase()).join(" ");
  return [
    { name: `Focus: ${label}`, text: joinToLength(letterGroups(pool, must, 40, 2, 4), len) },
    exRhythm(allowed, must, len),
    exBigrams(allowed, must, words, len),
    exWords(words, must, allowed, len),
    exSentences(sentences, words, allowed, must, Math.round(len * 1.2)),
  ];
};

// Text for the one-minute speed test.
KQ.speedTestText = () => shuffle(KQ.PARAGRAPHS).join(" ");

// Word pools for Letter Rain, by difficulty.
KQ.gameWords = function (difficulty) {
  const home = new Set("asdfghjkl; ");
  if (difficulty === "home") return wordsFor(home).concat(letterGroups("asdfghjkl".split(""), [], 60, 2, 4));
  if (difficulty === "letters") return KQ.WORDS.filter((w) => w.length >= 2);
  const caps = KQ.WORDS.filter((w) => w.length >= 3).map((w) => w[0].toUpperCase() + w.slice(1));
  const punct = ["it's", "don't", "can't", "wow!", "yes!", "why?", "go!", "I'm", "we'll", "3 cats", "5 dogs", "10 pigs", "2 hens", "7 ants"];
  return KQ.WORDS.concat(caps, punct, punct);
};
